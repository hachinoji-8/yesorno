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
// 分岐、直列、削除ロジック追加
// ------------------------------
async function addBranch(key) {
  let num = parseInt(key[0]) + 1;
  let nextA = num + "A";
  let nextB = num + "B";

  currentSlide.nodes[key].type = "branch";
  currentSlide.nodes[key].yes = nextA;
  currentSlide.nodes[key].no = nextB;

  currentSlide.nodes[nextA] = { type: "linear", next: null };
  currentSlide.nodes[nextB] = { type: "linear", next: null };

  await saveSlide();
  renderTree();
}

async function addLinear(key) {
  let num = parseInt(key[0]) + 1;
  let nextA = num + "A";

  currentSlide.nodes[key].type = "linear";
  currentSlide.nodes[key].next = nextA;

  currentSlide.nodes[nextA] = { type: "linear", next: null };

  await saveSlide();
  renderTree();
}

async function deleteNode(key) {
  if (!isLeafNode(key)) {
    alert("最下層だけ削除できます");
    return;
  }

  delete currentSlide.nodes[key];

  // 親の参照を消す
  let parent = getParentNode(key);
  let p = currentSlide.nodes[parent];
  if (p) {
    if (p.type === "branch") {
      if (p.yes === key) p.yes = null;
      if (p.no === key) p.no = null;
    }
    if (p.type === "linear" && p.next === key) {
      p.next = null;
    }
  }

  await saveSlide();
  renderTree();
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

    // ノード名
    let title = document.createElement("div");
    title.textContent = k;
    div.appendChild(title);

    // 画像
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

    // ボタンエリア
    let btnArea = document.createElement("div");
    btnArea.style.marginTop = "5px";

    // 分岐
    let btnBranch = document.createElement("button");
    btnBranch.textContent = "＋Y";
    btnBranch.onclick = e => {
      e.stopPropagation();
      addBranch(k);
    };
    btnArea.appendChild(btnBranch);

    // 直列
    let btnLinear = document.createElement("button");
    btnLinear.textContent = "＋｜";
    btnLinear.onclick = e => {
      e.stopPropagation();
      addLinear(k);
    };
    btnArea.appendChild(btnLinear);

    // 削除
    let btnDelete = document.createElement("button");
    btnDelete.textContent = "－";
    btnDelete.onclick = e => {
      e.stopPropagation();
      deleteNode(k);
    };
    btnArea.appendChild(btnDelete);

    div.appendChild(btnArea);

    // 画像選択
    div.onclick = () => selectImage(k);

    area.appendChild(div);
  }
}
// ------------------------------
// ○×UI切替得
// ------------------------------
function togglePlayMode() {
  playMode = (playMode === "yesno") ? "marubatsu" : "yesno";
  alert("PLAY画面の表示モードを変更しました");
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
// PLAY画面のボタン表示を関数化
// ------------------------------

function renderPlayButtons(node) {
  const btnLeft = document.getElementById("btnLeft");
  const btnRight = document.getElementById("btnRight");
  const btnNext = document.getElementById("btnNext");

  // まず全部表示状態に戻す
  btnLeft.classList.remove("hidden");
  btnRight.classList.remove("hidden");
  btnNext.classList.remove("hidden");

  if (node.type === "branch") {
    // YES / NO or 〇 / ×
    if (playMode === "yesno") {
      btnLeft.textContent = "NO";
      btnRight.textContent = "YES";
    } else {
      btnLeft.textContent = "×";
      btnRight.textContent = "〇";
    }
    btnNext.classList.add("hidden");

  } else {
    // NEXT only
    btnLeft.classList.add("hidden");
    btnRight.classList.add("hidden");
  }
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
  renderPlayButtons(currentSlide.nodes[key]);
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
