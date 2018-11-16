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
        comment: "Another 2nd comment loaded from API, with children",
        author: "9000",
        children: [
          {
            id: 5040,
            comment: "I agree with 9000",
            author: "Alice"
          },
          {
            id: 5045,
            comment: "I disagree",
            author: "Bob",
            children: [
              {
                id: 5046,
                comment: "For what reason?",
                author: "Alice",
                children: [
                  {
                    id: 5045,
                    comment: "It's a secret",
                    author: "Bob"
                  }
                ]
              },
              {
                id: 5045,
                comment: "Where is the batmobile parked?",
                author: "Batman"
              }
            ]
          }
        ]
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
