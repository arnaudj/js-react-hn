import ReactDOM from "react-dom";
import React, { useEffect } from "react";
import { observable, action, configure, runInAction, autorun } from "mobx";
import { observer, inject, Provider } from "mobx-react";
import DevTools from "mobx-react-devtools";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { apiGetComments } from "../api";

/**
 * React hooks and mobx-react: mobx-react isn't ready for hooks;
 * -: requires a workaround: use a dedicated function component, as hooks do not support classes and inject/observe on a function do not match hooks invariant check 'Hooks can only be called inside the body of a function component'
 * +: component better isolated (but still staful due to useEffect)
 */

configure({ enforceActions: "always" });

const Home = () => (
  <div>
    <h2>Home</h2>
  </div>
);

// use function component for useEffect
const StoryComponentFunctionComponent = ({ onShow, story, comments }) => {
  useEffect(() => {
    onShow();
  });

  return (
    <div>
      <h3>
        Reading story {story.id}: {story.title}
        <br />
      </h3>
      {story.isFetching ? (
        <span>Loading...</span>
      ) : (
        <div>
          Story comments:
          <br />
          {comments.length
            ? comments.map(comment => (
                <div key={comment.id}>
                  - {comment.author}: {comment.comment}
                  <br />
                </div>
              ))
            : "No comment"}
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
      }
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
      />
    );
  })
);

const StoriesList = inject("store")(({ baseUrl, store: { stories } }) => (
  <div>
    <h2>Stories</h2>
    <div>
      {[...stories.values()].map(story => (
        <div key={story.id}>
          <Link to={`${baseUrl}/${story.id}`}>{story.title}</Link>
        </div>
      ))}
    </div>
  </div>
));

const Stories = ({ match: { url } }) => (
  <div>
    <Route
      exact
      path={`${url}/`}
      render={props => <StoriesList baseUrl={url} {...props} />}
    />
    <Route
      path={`${url}/:storyId`}
      render={props => <StoryComponent {...props} />}
    />
  </div>
);

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
        console.log(`Store.Fetch fetchList: empty}`);
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

const BasicExample = props => {
  return (
    <Provider store={props.store}>
      <React.Fragment>
        <Router>
          <div>
            <Link to="/">Home</Link>
            <br />
            <Link to="/stories">Stories</Link>
            <hr />
            <Route exact path="/" component={Home} />
            <Route path="/stories" render={props => <Stories {...props} />} />
          </div>
        </Router>
        <DevTools />
      </React.Fragment>
    </Provider>
  );
};

const store = new Store();
store.initStore();

ReactDOM.render(
  <BasicExample store={store} />,
  document.getElementById("root")
);
export default BasicExample;