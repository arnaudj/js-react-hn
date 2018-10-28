export const apiGetComments = storyId => {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, 1000, [
      {
        id: 5010,
        storyId: storyId,
        comment: "A comment loaded from API",
        author: "hal"
      },
      {
        id: 5011,
        storyId: storyId,
        comment: "Another 2nd comment loaded from API",
        author: "9000"
      },
      {
        id: 5012,
        storyId: storyId,
        comment: "Another 3rd comment loaded from API",
        author: "hal"
      }
    ]);
  });
};
