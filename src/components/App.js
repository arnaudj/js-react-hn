import ReactDOM from "react-dom";
import React from "react";
import { observable, action, configure, runInAction, autorun } from "mobx";
import { observer, inject, Provider } from "mobx-react";
import DevTools from "mobx-react-devtools";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { apiGetComments } from "../api";

configure({ enforceActions: "always" });

const Home = () => (
  <div>
    <h2>Home</h2>
  </div>
);

@inject("store")
@observer
class StoryComponent extends React.Component {
  // lifecycle: everytime displayed by router (even on visit again)
  componentWillMount() {
    const {
      store,
      match: {
        params: { storyId }
      }
    } = this.props;
    store.actionUserNavigatesToStory(storyId);
  }

  // lifecycle: everytime navigated away by router
  componentWillUnmount() {}

  render() {
    const {
      store,
      match: {
        params: { storyId }
      }
    } = this.props;

    console.log(`story#${storyId}: render()`);

    const story = store.stories.get(Number(storyId));
    const storyComments = story.comments;
    const hasComments = storyComments.length; // hit array property now to register observer atom (since story.isFetching eq true at first run, checking comments length later after isFetching check is too late and wouldn't trigger a re-render otherwise)
    return (
      <div>
        <h3>
          Reading story {storyId}: {story.title}
          <br />
        </h3>
        {story.isFetching ? (
          <span>Loading...</span>
        ) : (
          <div>
            Story comments:
            <br />
            {hasComments
              ? storyComments.map(comment => (
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
  }
}

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
      if (this._fetchList.length === 0) return; // touch fetchList property to register reaction
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
    return this.stories.get(storyId);
  }

  @action.bound
  addStory(id, title, author) {
    this.stories.set(id, new Story(id, title, author));
  }
}

class BasicExample extends React.Component {
  constructor(props) {
    super(props);
    this.state = { store: props.store }; // hop via state, else in render() propagation of props to Stories will fail on 2nd iteration (happens right after 1st one where props is available)
  }
  render() {
    return (
      <Provider store={this.state.store}>
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
  }
}

const store = new Store();
store.initStore();

ReactDOM.render(
  <BasicExample store={store} />,
  document.getElementById("root")
);
export default BasicExample;
