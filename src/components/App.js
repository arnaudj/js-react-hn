// TODO Make comments expandable/collapsible
// TODO Make story link clickable to website url
// FIXME When story is loading its comments: should display "Loading..." not "No comment"
// FIXME Bug when going straight to story page: avoid hitting REST story load more than once during story loading phase ('actionUserNavigatesToStory(): go' seem to happen after each refresh via onShow: 2nd call is debounced with isFetching, but 3rd calls happens after: set a lastLoadedTime epoch on story or change loading design?)
// Bug: Filter dead comments (seems not possible with this API)

import ReactDOM from "react-dom";
import React, { useEffect } from "react";
import { observable, action, configure, runInAction, autorun } from "mobx";
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
const StoryComponentFunctionComponent = ({ onShow, story, isColdBoot, classes }) => {
  useEffect(
    () => {
      onShow();
    },
    [!isColdBoot ? story.num_comments : -1] // inputs (ala selector); LOW use as cache expiry bust
  );

  return (
    <div>
      {// story is null when straight to story view & index is skipped
        isColdBoot || story.isFetching ? (
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

    const story = store.getStory(storyId);
    const isColdBoot = !story; // story is null when straight to story view & index is skipped

    // hit array property now to register observer atom (within render's immediate body and don't hide behind isLoading either)
    // Because observer only applies to exactly the render function of the current component; passing a render callback or component to a child component doesn't become reactive automatically
    // https://github.com/mobxjs/mobx/blob/gh-pages/docs/best/react.md#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render
    const nbCommentsInStore = !isColdBoot ? story.comments.length : -1;

    return (
      <StoryComponentFunctionComponent
        onShow={() => store.actionUserNavigatesToStory(storyId)}
        story={story}
        isColdBoot={isColdBoot}
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
  if (url == null || url.startsWith("Ask HN") || url.startsWith("Tell HN"))
    return null;

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

  constructor(storyJson) {
    // const { objectID: id, created_at, title, author, url, points, num_comments } = storyJson;
    Object.assign(this, storyJson);
    this.id = this.objectID;
  }

  @action.bound
  addComment(commentJson) {
    this.comments.push(new Comment(commentJson));
  }
}

// prettier-ignore
class Store {
  @observable stories = new Map();
  @observable _fetchList = [];

  constructor() {
    autorun(() => {
      if (this._fetchList.length === 0) {  // touch fetchList property to register reaction
        console.log(`Store.Fetch fetchList: empty`);
        return;
      }
      const storyId = this.pollFetchList();

      let story = this.getStory(storyId);
      if (!story) {
        runInAction(() => {
          story = this.addStory(new Story({ objectID: storyId }));
        });
      }

      if (story.comments.length) {
        console.log(`Fetch for ${storyId}: cache hit`);
        return;
      }

      if (story.isFetching) {
        console.log(`Fetch for ${storyId}: already fetching`);
        return;
      }

      console.log(`Fetch for ${storyId}: querying API...`);
      runInAction(() => (story.isFetching = true));
      apiGetComments(storyId).then(json => {
        runInAction("apiGetCommentsSuccess", () => {
          const story = this.getStory(storyId);
          console.log('apiGetCommentsSuccess: story: ', story)
          console.log('apiGetCommentsSuccess: comments: ', json)
          const comments = json.data.children;
          for (let commentJson of comments)
            story.addComment(commentJson);
          story.isFetching = false;
          console.log(`Fetch for ${storyId} complete: `, story);
        });
      });
    });
  }

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

  @action.bound
  actionUserNavigatesToStory(id) {
    console.log(
      "actionUserNavigatesToStory(): go");
    this._fetchList.push(id);
    console.log(
      "actionUserNavigatesToStory(): after: _fetchList: " + this._fetchList
    );
  }

  @action.bound
  pollFetchList() {
    return this._fetchList.shift();
  }

  getStory(storyId) {
    return this.stories.get(storyId);
  }

  @action.bound
  addStory(story) {
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
store.loadStories();

ReactDOM.render(<BasicExample store={store} />, document.getElementById("root"));
export default BasicExample;
