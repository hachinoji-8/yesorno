// ------------------------------
// IndexedDB 初期化
// ------------------------------
let db;
const DB_NAME = "SlideAppDB";
const DB_VERSION = 1;

const openReq = indexedDB.open(DB_NAME, DB_VERSION);

openReq.onupgradeneeded = e => {
  db = e.target.result;

  if (!db.objectStoreNames.contains("slides")) {
    db.createObjectStore("slides", { keyPath: "key" });
  }

  if (!db.objectStoreNames.contains("images")) {
    db.createObjectStore("images", { keyPath: "nodeKey" });
  }
};

openReq.onsuccess = e => {
  db = e.target.result;
  initApp(); // app.js 側の初期化
};

openReq.onerror = e => {
  console.error("DB error:", e);
};

// ------------------------------
// スライド保存
// ------------------------------
function saveSlideToDB(slideObj) {
  return new Promise(resolve => {
    const tx = db.transaction("slides", "readwrite");
    tx.objectStore("slides").put(slideObj);
    tx.oncomplete = resolve;
  });
}

// ------------------------------
// スライド読み込み
// ------------------------------
function loadSlideFromDB(key) {
  return new Promise(resolve => {
    const tx = db.transaction("slides", "readonly");
    const req = tx.objectStore("slides").get(key);
    req.onsuccess = () => resolve(req.result);
  });
}

// ------------------------------
// スライド一覧取得
// ------------------------------
function getAllSlides() {
  return new Promise(resolve => {
    const tx = db.transaction("slides", "readonly");
    const store = tx.objectStore("slides");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

// ------------------------------
// スライド削除
// ------------------------------
function deleteSlideFromDB(key) {
  return new Promise(resolve => {
    const tx = db.transaction("slides", "readwrite");
    tx.objectStore("slides").delete(key);
    tx.oncomplete = resolve;
  });
}

// ------------------------------
// 画像保存（Blob）
// ------------------------------
function saveImage(nodeKey, blob) {
  return new Promise(resolve => {
    const tx = db.transaction("images", "readwrite");
    tx.objectStore("images").put({ nodeKey, blob });
    tx.oncomplete = resolve;
  });
}

// ------------------------------
// 画像読み込み
// ------------------------------
function loadImage(nodeKey) {
  return new Promise(resolve => {
    const tx = db.transaction("images", "readonly");
    const req = tx.objectStore("images").get(nodeKey);
    req.onsuccess = () => {
      if (req.result) resolve(req.result.blob);
      else resolve(null);
    };
  });
}
