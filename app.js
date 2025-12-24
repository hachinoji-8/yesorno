let slides = [];
let currentSlide = null;
let currentSlideKey = null;
let currentPlayNode = null;
let playMode = "yesno"; 



// ------------------------------
// 初期化（DB読み込み後に呼ばれる）
// ------------------------------
async function initApp() {
  slides = await getAllSlides();

  if (slides.length === 0) {
    await createNewSlide();
  } else {
    slides.sort((a, b) => b.key.localeCompare(a.key));
    loadSlide(slides[0].key);
  }

  renderSlideList();
}

// ------------------------------
// スライド読み込み
// ------------------------------
async function loadSlide(key) {
  currentSlideKey = key;
  currentSlide = await loadSlideFromDB(key);
  renderTree();
}

// ------------------------------
// スライド保存
// ------------------------------
async function saveSlide() {
  await saveSlideToDB(currentSlide);
}

// ------------------------------
// 新規スライド
// ------------------------------
async function createNewSlide() {
  let num = 1;
  while (slides.find(s => s.key === "slide_" + num)) num++;

  let key = "slide_" + num;

  let slideObj = {
    key,
    title: "Slide " + num,
    start: "1A",
    nodes: {
      "1A": { type: "linear", next: null }
    }
  };

  await saveSlideToDB(slideObj);
  slides = await getAllSlides();
  slides.sort((a, b) => b.key.localeCompare(a.key));

  loadSlide(key);
  renderSlideList();
}

// ------------------------------
// スライド削除
// ------------------------------
async function deleteSlide() {
  await deleteSlideFromDB(currentSlideKey);
  slides = await getAllSlides();

  if (slides.length === 0) {
    await createNewSlide();
  } else {
    slides.sort((a, b) => b.key.localeCompare(a.key));
    loadSlide(slides[0].key);
  }

  renderSlideList();
}

// ------------------------------
// スライド一覧描画
// ------------------------------
function renderSlideList() {
  let list = document.getElementById("slideList");
  list.innerHTML = "";

  slides.forEach(s => {
    let div = document.createElement("div");
    div.textContent = s.title;
    div.onclick = () => loadSlide(s.key);
    list.appendChild(div);
  });

  let btnNew = document.createElement("button");
  btnNew.textContent = "新規作成";
  btnNew.onclick = createNewSlide;
  list.appendChild(btnNew);

  let btnDel = document.createElement("button");
  btnDel.textContent = "削除";
  btnDel.onclick = deleteSlide;
  list.appendChild(btnDel);

  let btnPlay = document.createElement("button");
  btnPlay.textContent = "PLAY";
  btnPlay.onclick = startPlay;
  list.appendChild(btnPlay);
}

// ------------------------------
// ツリー描画
// ------------------------------
async function renderTree() {
  let area = document.getElementById("treeArea");
  area.innerHTML = "";

  let keys = Object.keys(currentSlide.nodes).sort();

  for (let k of keys) {
    let div = document.createElement("div");
    div.className = "node";
    div.textContent = k;

    let blob = await loadImage(currentSlideKey + "_" + k);
    if (blob) {
      let img = document.createElement("img");
      img.src = URL.createObjectURL(blob);
      img.style.width = "100%";
      img.style.height = "80px";
      img.style.objectFit = "cover";
      div.appendChild(img);
    } else {
      div.appendChild(document.createTextNode("\nNO IMAGE"));
    }

    div.onclick = () => selectImage(k);
    area.appendChild(div);
  }
}

// ------------------------------
// 画像選択
// ------------------------------
function selectImage(nodeKey) {
  let input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async e => {
    let file = e.target.files[0];
    await saveImage(currentSlideKey + "_" + nodeKey, file);
    renderTree();
  };

  input.click();
}

// ------------------------------
// PLAY開始
// ------------------------------
async function startPlay() {
  document.getElementById("editor").classList.add("hidden");
  document.getElementById("play").classList.remove("hidden");

  playNode(currentSlide.start);
}

// ------------------------------
// ノード表示
// ------------------------------
async function playNode(key) {
  currentPlayNode = key;

  let blob = await loadImage(currentSlideKey + "_" + key);
  let img = document.getElementById("playImage");

  if (blob) img.src = URL.createObjectURL(blob);
  else img.src = "noimage.png";

  let btns = document.getElementById("playButtons");
  btns.classList.add("hidden");

  setTimeout(() => btns.classList.remove("hidden"), 2000);
}

// ------------------------------
// スワイプ処理
// ------------------------------
let touchStartX = 0;
let touchStartY = 0;

const playArea = document.getElementById("play");

playArea.addEventListener("touchstart", e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

playArea.addEventListener("touchend", e => {
  let dx = e.changedTouches[0].clientX - touchStartX;
  let dy = e.changedTouches[0].clientY - touchStartY;

  let absX = Math.abs(dx);
  let absY = Math.abs(dy);

  if (absX > absY && absX > 30) {
    handleSwipe(dx > 0 ? "right" : "left");
  }

  if (absY > absX && absY > 30) {
    handleSwipe(dy > 0 ? "down" : "up");
  }
});

function handleSwipe(dir) {
  let node = currentSlide.nodes[currentPlayNode];

  if (isLeafNode(currentPlayNode)) {
    if (dir === "left" || dir === "right") {
      playNode("1A");
      return;
    }
  }

  if (dir === "up") {
    if (currentPlayNode === "1A") {
      returnToMenu();
      return;
    }
    playNode(getParentNode(currentPlayNode));
    return;
  }

  if (dir === "down") {
    if (currentPlayNode === "1A") {
      returnToMenu();
      return;
    }
    playNode("1A");
    return;
  }

  if (dir === "right") {
    if (node.type === "branch") playNode(node.yes);
    else playNode(node.next);
    return;
  }

  if (dir === "left") {
    if (node.type === "branch") playNode(node.no);
    else playNode(node.next);
    return;
  }
}

function isLeafNode(key) {
  let node = currentSlide.nodes[key];
  if (!node) return true;
  if (node.type === "branch") return false;
  if (node.type === "linear" && node.next) return false;
  return true;
}

function getParentNode(key) {
  let num = parseInt(key[0]);
  let letter = key[1];
  return (num - 1) + letter;
}

function returnToMenu() {
  document.getElementById("play").classList.add("hidden");
  document.getElementById("editor").classList.remove("hidden");
}
