import FrontPageData from "./algolia-frontpage-canned";
import item_18475438 from "./item_18475438.json";

export const apiGetFrontPage = () => {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, 100, FrontPageData);
  });
};

export const apiGetComments = storyId => {
  return new Promise((resolve, _reject) => {
    const json = storyId === "18475438" ? item_18475438 : {};
    setTimeout(resolve, 100, json);
  });
};
