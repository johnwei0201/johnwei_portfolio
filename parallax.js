/**
 * =====================================================================
 * 1. 全域變數定義 (Global Variables)
 * =====================================================================
 */
let index = 1; // 輪播圖索引
let interval; // 輪播圖定時器
let moveSlide; // 輪播圖移動函式 (供外部呼叫)

/**
 * =====================================================================
 * 2. 星空背景 - 滾動視差區 (Parallax Effect)
 * =====================================================================
 */
// 各星層原始長寬比（高 ÷ 寬），用來推算渲染高度
const LAYER_RATIO = {
  first: 5712 / 1033, // bg_First_layer.png
  second: 5857 / 1052, // bg_Second_layerr.png
  third: 5580 / 974, // bg_Third_layer.png
  deep: 6841 / 1920, // background.png（密集星海）
};

// 各層寬度（佔視窗寬度 %）
const LAYER_WIDTH = { first: 80, second: 50, third: 70, deep: 100 };

// 期望速率。實際速率會再受圖高限制，見 measureParallax()
const LAYER_RATE = { first: 0.3, second: 0.05, third: 0.02, deep: 0.7 };

const parallaxEl = document.querySelector(".parallax");
let parallaxLayout = null;

/**
 * 量測視窗尺寸，算出各層的「安全速率」。
 * 速率上限 = (圖的渲染高度 - 視窗高) ÷ 總捲動距離，
 * 超過這個值，捲到底時圖就會見底露出空白。
 */
function measureParallax() {
  if (!parallaxEl) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);

  const rate = {};
  Object.keys(LAYER_RATIO).forEach((key) => {
    const renderedH = vw * (LAYER_WIDTH[key] / 100) * LAYER_RATIO[key];
    const spare = renderedH - vh;
    rate[key] = spare <= 0 ? 0 : Math.min(LAYER_RATE[key], spare / maxScroll);
  });

  parallaxLayout = { rate };
}

function updateParallax() {
  if (!parallaxEl) return;
  if (!parallaxLayout) measureParallax();

  const scrolled = window.scrollY;
  const vh = window.innerHeight;
  const { rate } = parallaxLayout;

  // 飛船 1：從 100vh 開始移動
  const ship1Pos = vh - scrolled * 0.5;
  // 飛船 2：從 120vh 開始移動
  const ship2Pos = vh * 1.2 - scrolled * 0.4 + 300;
  // 星層 1：起始點設為 vh，確保從第二頁開始出現
  const layer1Pos = vh - scrolled * rate.first;

  parallaxEl.style.backgroundPosition = [
    `left 8% top ${ship1Pos}px`,
    `right 8% top ${ship2Pos}px`,
    `center ${layer1Pos}px`,
    `center ${0 - scrolled * rate.second}px`,
    `center ${0 - scrolled * rate.third}px`,
    `center ${0 - scrolled * rate.deep}px`,
  ].join(", ");
}

// 捲動事件用 rAF 節流，避免每個事件都重繪整組圖層
let parallaxTicking = false;
function onParallaxScroll() {
  if (parallaxTicking) return;
  parallaxTicking = true;
  requestAnimationFrame(() => {
    updateParallax();
    parallaxTicking = false;
  });
}

// 監聽捲動與載入
window.addEventListener("scroll", onParallaxScroll, { passive: true });
window.addEventListener("resize", () => {
  measureParallax();
  updateParallax();
});
window.addEventListener("DOMContentLoaded", () => {
  measureParallax();
  updateParallax();
});
// 圖片載入後頁面總高度才確定，重新量一次速率
window.addEventListener("load", () => {
  measureParallax();
  updateParallax();
});

/**
 * =====================================================================
 * 3. 導覽列 - 箭頭指示器與 Sticky 控制 (Nav Arrow & Sticky)
 * =====================================================================
 */
const navUl = document.querySelector(".nav_ul");
const navItems = document.querySelectorAll(".nav_li");
const navZone = document.querySelector(".nav_zone");
let lastActiveItem = null;

// 設定箭頭位置與 Active 狀態
function setArrow(item) {
  const parent = item.closest(".nav_li");
  const itemRect = item.getBoundingClientRect();
  const navRect = navUl.getBoundingClientRect();

  const x = parent.getBoundingClientRect().left - navRect.left;
  const y = itemRect.top - navRect.top + itemRect.height / 2;

  navUl.style.setProperty("--arrow-x", `${x}px`);
  navUl.style.setProperty("--arrow-y", `${y}px`);

  navUl
    .querySelectorAll(".active")
    .forEach((el) => el.classList.remove("active"));
  item.classList.add("active");
  parent.classList.add("active");

  lastActiveItem = item;
}

// 隱藏箭頭
function hideArrow() {
  navUl.style.setProperty("--arrow-x", `-999px`);
  navUl.style.setProperty("--arrow-y", `-999px`);
  navUl
    .querySelectorAll(".active")
    .forEach((el) => el.classList.remove("active"));
  lastActiveItem = null;
}

// 初始化與 Hover 事件監聽
window.addEventListener("load", () => {
  const firstItem = document.querySelector(".nav_li:first-child > a");
  if (firstItem) setArrow(firstItem);
});
navItems.forEach((item) => {
  item.addEventListener("mouseenter", () => {
    // 桌機版才執行 Hover 箭頭移動
    if (window.innerWidth > 768) setArrow(item);
  });
});

//  Sticky 導覽列切換與箭頭修正
window.addEventListener("scroll", () => {
  const triggerPoint = window.innerHeight * 0.5;
  const isSticky = window.scrollY > triggerPoint;

  if (isSticky !== navZone.classList.contains("sticky-active")) {
    navZone.classList.toggle("sticky-active", isSticky);

    // 位置改變後修正箭頭座標
    requestAnimationFrame(() => {
      if (lastActiveItem) setArrow(lastActiveItem);
    });
  }
});

/**
 * =====================================================================
 * 4. 輪播圖區 - 核心邏輯 (Carousel)
 * =====================================================================
 */
window.addEventListener("DOMContentLoaded", () => {
  const track = document.querySelector(".carousel_track");
  let slides = document.querySelectorAll(".carousel_track img");
  const prevBtn = document.querySelector(".prev");
  const nextBtn = document.querySelector(".next");

  if (!track || slides.length === 0) return;

  // 實作無縫輪播：複製首尾元素
  const firstClone = slides[0].cloneNode(true);
  const lastClone = slides[slides.length - 1].cloneNode(true);
  track.appendChild(firstClone);
  track.insertBefore(lastClone, slides[0]);

  slides = document.querySelectorAll(".carousel_track img");
  track.style.transform = `translateX(-${index * 100}%)`;

  // 移動函式
  moveSlide = function () {
    track.style.transition = "transform 0.5s ease";
    track.style.transform = `translateX(-${index * 100}%)`;
  };

  const nextSlide = () => {
    if (index >= slides.length - 1) return;
    index++;
    moveSlide();
  };

  const prevSlide = () => {
    if (index <= 0) return;
    index--;
    moveSlide();
  };

  // 自動輪播控制
  // 先 clearInterval 再設定，避免重複呼叫時堆疊出多個計時器
  const startAutoSlide = () => {
    clearInterval(interval);
    interval = setInterval(nextSlide, 3000);
  };
  const stopAutoSlide = () => clearInterval(interval);
  const resetAutoSlide = startAutoSlide;

  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      nextSlide();
      resetAutoSlide();
    });
  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      prevSlide();
      resetAutoSlide();
    });

  // 無縫切換重置位置
  track.addEventListener("transitionend", () => {
    if (slides[index].isSameNode(firstClone)) {
      track.style.transition = "none";
      index = 1;
      track.style.transform = `translateX(-${index * 100}%)`;
    }
    if (slides[index].isSameNode(lastClone)) {
      track.style.transition = "none";
      index = slides.length - 2;
      track.style.transform = `translateX(-${index * 100}%)`;
    }
  });

  startAutoSlide();

  // 游標／手指停在輪播上就暫停，移開才繼續。
  // 掛在 .carousel 而非 .carousel_track，才能連左右箭頭按鈕一起涵蓋
  // （按鈕是 .carousel 的絕對定位子元素，不在 track 內）。
  const carouselBox = document.querySelector(".carousel") || track;
  const isTouch = (e) => e.pointerType !== "mouse";

  // 滑鼠：移入暫停、移出繼續
  carouselBox.addEventListener("pointerenter", stopAutoSlide);
  carouselBox.addEventListener("pointerleave", startAutoSlide);
  carouselBox.addEventListener("pointercancel", startAutoSlide);

  // 觸控：按住暫停、放開繼續。
  // 觸控指標在 pointerup 後就消失，瀏覽器多半會補送 pointerleave，
  // 但不是每家都可靠，這裡明確處理，避免手指放開後輪播卡住不動。
  carouselBox.addEventListener("pointerdown", (e) => {
    if (isTouch(e)) stopAutoSlide();
  });
  carouselBox.addEventListener("pointerup", (e) => {
    if (isTouch(e)) startAutoSlide();
  });
});

/**
 * =====================================================================
 * 5. 作品集連結 - 連動輪播與平滑捲動 (Portfolio Links)
 * =====================================================================
 */
const allWorkLinks = document.querySelectorAll("a[data-index]");

allWorkLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    const targetIdx = link.getAttribute("data-index");
    if (targetIdx === null) return;

    e.preventDefault();
    hideArrow();

    // 關閉手機版選單
    const parentLi = link.closest(".nav_li");
    if (parentLi) parentLi.classList.remove("active");
    if (navUlEl) navUlEl.classList.remove("open");

    // 同步輪播圖位置
    index = parseInt(targetIdx) + 1;
    if (typeof moveSlide === "function") moveSlide();

    // 平滑捲動至指定區塊
    const target = document.querySelector("#portfolio");
    const offset = 180;
    const top =
      target.getBoundingClientRect().top + window.pageYOffset + offset;

    window.scrollTo({ top: top, behavior: "smooth" });
  });
});

/**
 * =====================================================================
 * 6. RWD 手機版 - 漢堡選單與手風琴 (Mobile Menu & Accordion)
 * =====================================================================
 */
const hamburger = document.querySelector(".hamburger");
const navUlEl = document.querySelector(".nav_ul");

hamburger.addEventListener("click", () => {
  navUlEl.classList.toggle("open");
});

document.querySelectorAll(".nav_li > a").forEach((link) => {
  link.addEventListener("click", (e) => {
    if (window.innerWidth > 768) return;

    const parent = link.parentElement;
    const dropdown = parent.querySelector(".dropdown");

    if (dropdown) {
      e.preventDefault();
      // 手風琴效果：關閉其他選單
      document.querySelectorAll(".nav_li").forEach((item) => {
        if (item !== parent) item.classList.remove("active");
      });
      parent.classList.toggle("active");
    } else {
      navUlEl.classList.remove("open");
    }
  });
});

/**
 * =====================================================================
 * 7. 互動小遊戲 - 角色選擇與視窗開啟 (Game Selector)
 * =====================================================================
 */
const playerItems = document.querySelectorAll(".player_item");

playerItems.forEach((item) => {
  item.addEventListener("mouseenter", () => {
    if (window.innerWidth <= 768) return; // 📱 手機不吃 hover

    document
      .querySelectorAll(".player_item")
      .forEach((i) => i.classList.remove("active"));

    item.classList.add("active");
  });

  item.addEventListener("click", () => {
    let mode;

    if (item.classList.contains("mobile-only")) {
      mode = "1"; // 手機一律單人
    } else {
      mode = item.textContent.includes("1") ? "1" : "2";
    }

    const w = 800;
    const h = 750;
    const y = window.top.outerHeight / 2 + window.top.screenY - h / 2;
    const x = window.top.outerWidth / 2 + window.top.screenX - w / 2;

    window.open(
      `game.html?mode=${mode}`,
      "SpaceShooter",
      `width=${w}, height=${h}, top=${y}, left=${x}`,
    );
  });
});
// ✅ 初始化選中第一個（桌機用）
window.addEventListener("DOMContentLoaded", () => {
  // 桌機
  const firstPlayer = document.querySelector(
    ".player_item.desktop-only:first-of-type",
  );
  if (firstPlayer) {
    firstPlayer.classList.add("active");
  }

  // 手機
  const mobilePlayer = document.querySelector(".mobile-only");
  if (mobilePlayer) {
    mobilePlayer.classList.add("active");
  }
});
