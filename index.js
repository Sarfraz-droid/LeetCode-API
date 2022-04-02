const puppeteer = require("puppeteer");
const express = require("express");
const app = express();
app.use(express.json());

let browser;

(async () => {
  browser = await puppeteer.launch({
    headless: false,
  });
})();

const getUserRanking = async (username) => {
  const page = await browser.newPage();
  await page.goto(`https://leetcode.com/${username}/`);
  let ranking = null;
  await page.waitForResponse(async (response) => {
    if (response.url() === "https://leetcode.com/graphql/") {
      const data = await response.json();
      if (data.data?.matchedUser?.username) {
        console.log("FOUND USER : ", username);
        ranking = {
          ...ranking,
          ranking: data.data.matchedUser.profile.ranking,
          realName: data.data.matchedUser.profile.realName,
          username: data.data.matchedUser.username,
        };
      } else if (data.data?.userContestRanking) {
        ranking = {
          ...ranking,
          contest_rating: data.data.userContestRanking.rating,
        };
        return true;
      }
    }
  });

  return ranking;
};

app.get("/", function (req, res) {
  res.send("Leetcode API");
});

app.post("/ranks", async (req, res) => {
  const { users } = req.body;
  const ranks = [];
  await Promise.all(
    users.map(async (user) => {
      const rank = await getUserRanking(user);

      console.log("ranks", rank);
      ranks.push(rank);
      return rank;
    })
  );

  (await browser.pages()).slice(1).map((page) => page.close());

  console.log("ranks", ranks);

  ranks.sort((a, b) => {
    if (a?.ranking < b?.ranking) return -1;
    if (a?.ranking > b?.ranking) return 1;
    return 0;
  });

  res.send(await Promise.all(ranks));
});

app.listen(process.env.PORT || 3000, function (req, res) {
  console.log("listening on port 3000");
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received.");
  browser.close();
});
