// TODO Make comments expandable/collapsible
// TODO Make story link clickable to website url
// Bug: Filter dead comments (seems not possible with this API)

import ReactDOM from "react-dom";
import React, { useEffect } from "react";
import { observable, action, configure, runInAction, computed } from "mobx";
import { observer, inject, Provider } from "mobx-react";
import DevTools from "mobx-react-devtools";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { apiGetFrontPage, apiGetComments } from "../api";

import withRootTheme from "../withRootTheme";
import "typeface-roboto";
import Typography from "@material-ui/core/Typography";
import CssBaseline from "@material-ui/core/CssBaseline";
import { withStyles } from "@material-ui/core/styles";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";

import Badge from "@material-ui/core/Badge";
// https://material.io/tools/icons/?icon=textsms&style=baseline
import MailIcon from "@material-ui/icons/Mail";

//
import ApolloClient from "apollo-boost";
import gql from "graphql-tag";

const styles = theme => ({
  lists: {
    backgroundColor: theme.palette.background.paper
  },
  commentsBadge: {
    margin: "1rem"
  },
  storyListItemWrapper: {
    /*http://howtocenterincss.com/#contentType=div&horizontal=left&vertical=middle*/
    display: "flex",
    alignItems: "center"
  },
  storyListTitle: {
    margin: "0.5rem"
  }
});

/**
 * Material-ui:
 * - TODO: add createMuiTheme: https://github.com/mui-org/material-ui/blob/master/examples/create-react-app-with-jss/src/withRoot.js
 *
 * React hooks and mobx-react: mobx-react isn't ready for hooks;
 * -: requires a workaround: use a dedicated function component, as hooks do not support classes and inject/observe on a function do not match hooks invariant check 'Hooks can only be called inside the body of a function component'
 * +: component better isolated (but still staful due to useEffect)
 */

configure({ enforceActions: "always" });

// use function component for useEffect
const StoryComponentFunctionComponent = ({ onShow, story, classes }) => {
  useEffect(() => {
    onShow();
  });

  return (
    <div>
      {// story is null when straight to story view & index is skipped
        story.isFetching || story.isFetching === undefined ? ( // loading already or cold boot and about to be loading right away
          <Typography variant="body1" gutterBottom>
            Loading...
        </Typography>
        ) : (
            <div>
              <StoryTitle title={`${story.title} (${story.id})`} classes={classes} />
              <Typography variant="body1" gutterBottom>
                Story comments:
            <br />
              </Typography>
              {story.comments.length ? (
                story.comments.map(comment => <StoryCommentComponent comment={comment} level={0} key={comment.id} />)
              ) : (
                  <Typography variant="body1" gutterBottom>
                    No comment...
            </Typography>
                )}
            </div>
          )}
    </div>
  );
};

const StoryCommentComponent = ({ comment, level }) =>
  comment.author ? ( // filter empty comments
    <Typography variant="body1" gutterBottom key={comment.id} style={{ marginLeft: `${level * 0.7}em` }}>
      [-] <u>{comment.author}</u> at {comment.created_at} ({comment.children ? comment.children.length : 0} children):
      <div dangerouslySetInnerHTML={{ __html: comment.text }} style={{ marginLeft: `${level * 0.7 + 0.2}em` }} />
      {comment.children ? (
        <div>
          {comment.children.map(child => (
            <StoryCommentComponent comment={child} level={level + 1} />
          ))}
        </div>
      ) : null}
    </Typography>
  ) : null;

const StoryComponent = inject("store")(
  observer(function doit(props) {
    const {
      store,
      match: {
        params: { storyId }
      },
      classes
    } = props;

    const story = store.getOrCreateStory(storyId);
    // hit array property now to register observer atom (within render's immediate body and don't hide behind loading flag either)
    // Because observer only applies to exactly the render function of the current component; passing a render callback or component to a child component doesn't become reactive automatically
    // https://github.com/mobxjs/mobx/blob/gh-pages/docs/best/react.md#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render
    const watchMe = story.fingerprint;

    return (
      <StoryComponentFunctionComponent
        onShow={() => store.actionUserNavigatesToStory(storyId)}
        story={story}
        classes={classes}
      />
    );
  })
);

const StoryTitle = ({ title, classes }) => (
  <Typography variant="h6" className={classes.storyListTitle} color="primary">
    {title}{" "}
  </Typography>
);

function extractDomain(url) {
  if (url == null || url.startsWith("Ask HN") || url.startsWith("Tell HN")) return null;

  // https://stackoverflow.com/a/8498629
  var matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
  var domain = matches && matches[1]; // domain will be null if no match is found
  return domain || url;
}

const StoriesList = inject("store")(
  observer(({ baseUrl, store: { stories }, classes }) => {
    const hasStories = store.stories.size > 0; // hit array property now to register observer atom
    const mapDomain = story => extractDomain(story.url);
    return (
      <div>
        <Typography variant="h6" gutterBottom>
          {hasStories ? "Stories" : "Loading stories..."}
        </Typography>
        <div className={classes.lists}>
          <List component="nav">
            {[...stories.values()].map(story => (
              <ListItem button component={props => <Link {...props} />} to={`${baseUrl}/${story.id}`} key={story.id}>
                <ListItemText
                  primary={
                    <div className={classes.storyListItemWrapper}>
                      <StoryTitle title={story.title} classes={classes} />{" "}
                      <Typography color="secondary">{mapDomain(story)} </Typography>
                    </div>
                  }
                />
                <ListItemSecondaryAction>
                  <Badge className={classes.commentsBadge} badgeContent={story.num_comments} color="primary">
                    <MailIcon />
                  </Badge>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </div>
      </div>
    );
  })
);

class Comment {
  id;
  author;
  comment_text;
  created_at;
  created_at_i;
  parent_id;
  story_id;
  children;

  constructor(jsonSource) {
    Object.assign(this, jsonSource); // Q&D assign from json
    this.id = this.objectID;
  }
}

// prettier-ignore
class Story {
  @observable id;
  @observable created_at;
  @observable created_at_i;
  @observable title;
  @observable author;
  @observable url;
  @observable points;
  @observable num_comments;
  @observable comments = [];
  //
  @observable isFetching;
  @observable fetchTime;

  constructor(storyJson) {
    // const { objectID: id, created_at, title, author, url, points, num_comments } = storyJson;
    Object.assign(this, storyJson);
    this.id = this.objectID;
  }

  @action.bound
  addComment(commentJson) {
    this.comments.push(new Comment(commentJson));
  }

  @computed get fingerprint() {
    return JSON.stringify({
      id: this.id,
      isFetching: this.isFetching,
      fetchTime: this.fetchTime,
      num_comments: this.num_comments
    });
  }
}

// prettier-ignore
class Store {
  @observable stories = new Map();

  @action.bound
  loadStories() {
    apiGetFrontPage().then(stories => this.initStore(stories.data.hits));
  }

  @action.bound
  initStore(json) {
    console.log('initStore: ', json);
    json.forEach(storyJson => {
      this.addStory(new Story(storyJson))
    });
  }

  getStory(storyId) {
    return this.stories.get(storyId);
  }

  @action.bound
  getOrCreateStory(storyId) {
    const story = this.getStory(storyId);
    return story ? story : this.addStory(new Story({ objectID: storyId, comments: [] }));
  }

  @action.bound
  actionUserNavigatesToStory(storyId) {
    const story = this.getOrCreateStory(storyId);

    if (story.isFetching) {
      console.log(`Fetch for ${storyId}: already fetching`);
      return;
    }

    if (story.fetchTime) { // todo cache bust
      console.log(`Fetch for ${storyId}: cache hit`);
      // story.comments.length may be empty at this point if no comment in story at the time
      return;
    }

    console.log(`Fetch for ${storyId}: querying API...`);
    story.isFetching = true;
    story.fetchTime = Date.now();

    apiGetComments(storyId).then(json => {
      runInAction("apiGetCommentsSuccess", () => {
        const story = this.getStory(storyId);
        console.log('apiGetCommentsSuccess: story: ', story)
        console.log('apiGetCommentsSuccess: comments: ', json)
        const comments = json.data.children;
        for (let commentJson of comments)
          story.addComment(commentJson);
        story.isFetching = false;
        console.log(`Fetch for ${storyId} complete at ${Date.now()} : `, story);
      });
    });

    return story;
  }

  @action.bound
  addStory(story) {
    const existing = this.stories.get(story.id);
    if (existing) {
      // can happen when index is bypassed, if getComments run first and then initStore
      // merge but don't overwrite fetch status flags, that where reinflated from default in new story's ctor (@observable fields)
      const { isFetching, fetchTime } = existing;
      const ret = Object.assign(existing, story);
      ret.isFetching = isFetching;
      ret.fetchTime = fetchTime;
      return ret;
    }

    this.stories.set(story.id, story);
    return story;
  }
}

const BasicExample = withRootTheme(
  withStyles(styles)(props => {
    return (
      <Provider store={props.store}>
        <React.Fragment>
          <CssBaseline />
          <Router>
            <div>
              <Route
                exact
                path="/"
                render={routeProps => (
                  <StoriesList
                    {...routeProps}
                    baseUrl="/story"
                    classes={props.classes} /* forward props.classes provided by withStyles()*/
                  />
                )}
              />
              <Route
                path="/story/:storyId"
                render={routeProps => <StoryComponent {...routeProps} {...props} classes={props.classes} />}
              />
            </div>
          </Router>
          <DevTools />
        </React.Fragment>
      </Provider>
    );
  })
);

const store = new Store();

// -------------------- GraphQL playground

const hnTopStories = gql`
query topStories($limit: Int!) {
  hn {
    stories(offset: 0, limit: $limit, storyType: "top") {
      id
      title
      url
    }
  }
}`

const hnItemById = gql`
# graphql/issues/91, recursive not possible
fragment comment on HackerNewsItem {
  ...commentBody
  kids {
    ...commentBody
    kids {
      ...commentBody
      kids {
        ...commentBody
        kids {
          ...commentBody
          kids {
            ...commentBody
            kids {
              ...commentBody
            }
          }
        }
      }
    }
  }
}

fragment commentBody on HackerNewsItem {
  id
  text
  deleted
}

query itemById($itemId: Int!) {
  hn {
    item(id: $itemId) {
      title
      kids {
        ...comment
      }
    }
  }
}
`;


// HN graphql 3rd party API providers:
// https://github.com/stubailo/microhn/blob/gh-pages/index.html
// https://github.com/clayallsopp/graphqlhub/blob/a70c35cfcde5ff90a7dce1163f59b7dae8fd9fbf/graphqlhub-schemas/src/hn.js 
//  -> https://github.com/clayallsopp/graphqlhub/blob/a70c35cfcde5ff90a7dce1163f59b7dae8fd9fbf/graphqlhub-schemas/src/apis/hn.js
// https://github.com/clayallsopp/graphqlhub/blob/a70c35cfcde5ff90a7dce1163f59b7dae8fd9fbf/graphqlhub-schemas/src/hn2.js

// Apollo graphql
// https://www.apollographql.com/docs/react/essentials/get-started.html
const client = new ApolloClient({
  uri: "https://www.graphqlhub.com/graphql"
});

client
  .query({ query: hnTopStories, variables: { limit: 5 } }) // todo limit:20
  .then(({ error, data, loading }) => {
    if (loading) { console.log('hnTopStories(): result: loading'); return; }
    if (error) { console.error('hnTopStories() err:', error); return; }
    data.hn.stories.forEach(story => {
      console.log('hnTopStories() res:', story);
      // FIXME: clone initStore's logic with Story() ctor for the graphql source's schema

      // TODO: move to actionUserNavigatesToStory
      client
        .query({ query: hnItemById, variables: { itemId: story.id } })
        .then(({ error, data, loading }) => {
          if (loading) { console.log('hnItemById(): result: loading'); return; }
          if (error) { console.error('hnItemById() err:', error); return; }
          console.log('hnItemById() res:', data);
        });

    });
  });



/*store.loadStories();

ReactDOM.render(<BasicExample store={store} />, document.getElementById("root"));
*/
export default BasicExample;
