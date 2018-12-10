import axios from 'axios';

export const apiGetFrontPage = () => {
  return axios.get('https://hn.algolia.com/api/v1/search?tags=front_page');
};

export const apiGetComments = storyId => {
  return axios.get(`https://hn.algolia.com/api/v1/items/${storyId}`);
};