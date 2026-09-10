const messages = [
  "你出现以后，很多小事都有了特别的意义。",
  "喜欢王峥，是那种想到名字都会嘴角上扬的喜欢。",
  "希望每一个普通的今天，都能因为你变得不普通。",
  "我喜欢你的认真，也喜欢你偶尔露出来的小可爱。",
  "如果心动可以被收藏，那你一定是我最珍贵的一页。"
];

let messageIndex = 0;

function changeText() {
  messageIndex = (messageIndex + 1) % messages.length;
  document.getElementById("msg").textContent = messages[messageIndex];
}
