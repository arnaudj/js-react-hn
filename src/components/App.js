import ReactDOM from "react-dom";
import React, { useEffect } from "react";
import { observable, action, configure, runInAction, autorun } from "mobx";
import { observer, inject, Provider } from "mobx-react";
import DevTools from "mobx-react-devtools";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { apiGetComments } from "../api";

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
const StoryComponentFunctionComponent = ({ onShow, story, comments, classes }) => {
  useEffect(() => {
    onShow();
  });

  return (
    <div>
      <StoryTitle title={`${story.title} (${story.id})`} classes={classes} />
      {story.isFetching ? (
        <Typography variant="body1" gutterBottom>
          Loading...
        </Typography>
      ) : (
        <div>
          <Typography variant="body1" gutterBottom>
            Story comments:
            <br />
          </Typography>
          {comments.length ? (
            comments.map(comment => (
              <Typography variant="body1" gutterBottom key={comment.id}>
                - {comment.author}: {comment.comment}
              </Typography>
            ))
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
    // hit array property now to register observer atom (within render's immediate body and don't hide behind isLoading either)
    // Because observer only applies to exactly the render function of the current component; passing a render callback or component to a child component doesn't become reactive automatically
    // https://github.com/mobxjs/mobx/blob/gh-pages/docs/best/react.md#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render
    const hasComments = story.comments.length;
    return (
      <StoryComponentFunctionComponent
        onShow={() => store.actionUserNavigatesToStory(story.id)}
        story={story}
        comments={story.comments}
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

const StoriesList = inject("store")(({ baseUrl, store: { stories }, classes }) => (
  <div>
    <Typography variant="h6" gutterBottom>
      Stories
    </Typography>
    <div className={classes.lists}>
      <List component="nav">
        {[...stories.values()].map(story => (
          <ListItem button component={props => <Link {...props} />} to={`${baseUrl}/${story.id}`} key={story.id}>
            <ListItemText
              primary={
                <div className={classes.storyListItemWrapper}>
                  <StoryTitle title={story.title} classes={classes} />{" "}
                  <Typography color="secondary"> (google.com)</Typography>
                </div>
              }
            />
            <ListItemSecondaryAction>
              <Badge className={classes.commentsBadge} badgeContent={4} color="primary">
                <MailIcon />
              </Badge>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </div>
  </div>
));

class Comment {
  id;
  storyId;
  text;
  author;

  constructor(jsonSource) {
    Object.assign(this, jsonSource); // Q&D assign from json
  }
}

// prettier-ignore
class Story {
  @observable id;
  @observable title;
  @observable author;
  @observable comments = [];

  constructor(id, title, author) {
    this.id = id;
    this.title = title;
    this.author = author;
  }

  @action.bound
  addComment(comment) {
    this.comments.push(new Comment(comment));
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

      if (this.getStory(storyId).comments.length) {
        console.log(`Fetch for ${storyId}: cache hit`);
        return;
      }
      const story = this.getStory(storyId);
      if (story.isFetching) {
        console.log(`Fetch for ${storyId}: already fetching`);
        return;
      }

      console.log(`Fetch for ${storyId}: querying API...`);
      runInAction(() => (story.isFetching = true));
      apiGetComments(storyId).then(json => {
        runInAction("apiGetCommentsSuccess", () => {
          const story = this.getStory(storyId);
          for (let commentJson of json)
            story.addComment(commentJson);
          story.isFetching = false;
          console.log(`Fetch for ${storyId} complete: `, story);
        });
      });
    });
  }

  @action.bound
  initStore() {
    this.addStory(1000, "A story", "john");
    this.addStory(1001, "Another story", "jane");
    this.getStory(1000).addComment({ id: 5000, storyId: 1000, comment: "A comment", author: "jake" });
  }

  @action.bound
  actionUserNavigatesToStory(id) {
    console.log(
      "actionUserNavigatesToStory(): go");
    this._fetchList.push(Number(id));
    console.log(
      "actionUserNavigatesToStory(): after: _fetchList: " + this._fetchList
    );
  }

  @action.bound
  pollFetchList() {
    return this._fetchList.shift();
  }

  getStory(storyId) {
    return this.stories.get(Number(storyId));
  }

  @action.bound
  addStory(id, title, author) {
    this.stories.set(id, new Story(id, title, author));
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
store.initStore();

ReactDOM.render(<BasicExample store={store} />, document.getElementById("root"));
export default BasicExample;
