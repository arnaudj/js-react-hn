import axios from 'axios';

export const apiGetFrontPage = () => {
  return axios.get('https://hn.algolia.com/api/v1/search?tags=front_page');
};

export const apiGetComments = storyId => {
  return axios.get(`https://hn.algolia.com/api/v1/items/${storyId}`);
};


export const storyFieldsMapper = jsonItem => {
  let ret = {
    id: jsonItem.objectID,
    created_at: jsonItem.created_at,
    title: jsonItem.title,
    author: jsonItem.author,
    url: jsonItem.url,
    points: jsonItem.points,
    num_comments: jsonItem.num_comments,
    comments: jsonItem.comments || []
  };
  if (jsonItem.id) // fallback when story created internally, not via net layer
    ret.id = jsonItem.id;
  return ret;
};

export const commentFieldsMapper = jsonItem => {
  let ret = {
    id: jsonItem.objectID,
    created_at: jsonItem.created_at,
    text: jsonItem.text,
    author: jsonItem.author,
    children: jsonItem.children || []
  };
  return ret;
};


