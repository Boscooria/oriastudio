const workspace = document.querySelector(".workspace");
const cards = [...document.querySelectorAll("[data-draggable]")];

const resetButton = document.querySelector("[data-reset]");
const shuffleButton = document.querySelector("[data-shuffle]");

const infoPanel = document.querySelector(".info-panel");
const backdrop = document.querySelector(".panel-backdrop");
const infoTrigger = document.querySelector("[data-info-trigger]");
const infoClosers = document.querySelectorAll("[data-info-close]");

const liveRegion = document.querySelector("[data-live-region]");

const projectDialog = document.querySelector(
  "[data-project-dialog]",
);

const projectClose = document.querySelector(
  "[data-project-close]",
);

const projectImage = document.querySelector(
  "[data-project-image]",
);

let projectVideo = document.querySelector(
  "[data-project-video]",
);

const projectNumber = document.querySelector(
  "[data-project-number]",
);

const projectTitle = document.querySelector(
  "[data-project-title]",
);

const projectDescription = document.querySelector(
  "[data-project-description]",
);

const projectYear = document.querySelector(
  "[data-project-year]",
);

const projectPrevious = document.querySelector(
  "[data-project-previous]",
);

const projectNext = document.querySelector(
  "[data-project-next]",
);

const projectCounter = document.querySelector(
  "[data-project-counter]",
);

/*
  Si todavía no existe el elemento <video> en el HTML,
  JavaScript lo crea automáticamente.
*/

if (!projectVideo && projectImage) {
  projectVideo = document.createElement("video");

  projectVideo.setAttribute("data-project-video", "");
  projectVideo.setAttribute("controls", "");
  projectVideo.setAttribute("playsinline", "");
  projectVideo.setAttribute("preload", "metadata");

  projectVideo.hidden = true;

  projectImage.insertAdjacentElement(
    "afterend",
    projectVideo,
  );
}

let activeCard = null;

let pointerOffsetX = 0;
let pointerOffsetY = 0;

let dragStartX = 0;
let dragStartY = 0;

let cardWasDragged = false;
let highestLayer = 10;

let lastOpenedCard = null;

let projectImages = [];
let currentProjectImage = 0;
let projectImageAlt = "";

let galleryTimer = null;

const initialPositions = new Map();

/* GUARDAR POSICIONES INICIALES */

function rememberInitialPositions() {
  cards.forEach((card) => {
    initialPositions.set(card, {
      left: card.offsetLeft,
      top: card.offsetTop,
      transform: getComputedStyle(card).transform,
    });

    card.style.left = `${card.offsetLeft}px`;
    card.style.top = `${card.offsetTop}px`;
  });
}

/* LÍMITES DEL ESPACIO DE TRABAJO */

function boundsFor(card) {
  const padding = 8;

  return {
    minX: padding,

    maxX: Math.max(
      padding,
      workspace.clientWidth -
        card.offsetWidth -
        padding,
    ),

    minY: 58,

    maxY: Math.max(
      58,
      workspace.clientHeight -
        card.offsetHeight -
        padding,
    ),
  };
}

function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max,
  );
}

function moveCard(card, left, top) {
  const bounds = boundsFor(card);

  card.style.left = `${clamp(
    left,
    bounds.minX,
    bounds.maxX,
  )}px`;

  card.style.top = `${clamp(
    top,
    bounds.minY,
    bounds.maxY,
  )}px`;
}

function bringToFront(card) {
  highestLayer += 1;
  card.style.zIndex = highestLayer;
}

/* ARRASTRAR TARJETAS */

function onPointerDown(event) {
  if (event.button !== 0) return;

  activeCard = event.currentTarget;

  const cardRect =
    activeCard.getBoundingClientRect();

  const workspaceRect =
    workspace.getBoundingClientRect();

  pointerOffsetX =
    event.clientX - cardRect.left;

  pointerOffsetY =
    event.clientY - cardRect.top;

  dragStartX = event.clientX;
  dragStartY = event.clientY;

  cardWasDragged = false;

  activeCard.setPointerCapture(
    event.pointerId,
  );

  activeCard.classList.add("is-active");

  document.body.classList.add(
    "is-dragging",
  );

  bringToFront(activeCard);

  activeCard.dataset.workspaceLeft = `${
    cardRect.left - workspaceRect.left
  }`;

  activeCard.dataset.workspaceTop = `${
    cardRect.top - workspaceRect.top
  }`;
}

function onPointerMove(event) {
  if (
    !activeCard ||
    event.currentTarget !== activeCard
  ) {
    return;
  }

  const distance = Math.hypot(
    event.clientX - dragStartX,
    event.clientY - dragStartY,
  );

  if (distance > 6) {
    cardWasDragged = true;
  }

  const workspaceRect =
    workspace.getBoundingClientRect();

  moveCard(
    activeCard,

    event.clientX -
      workspaceRect.left -
      pointerOffsetX,

    event.clientY -
      workspaceRect.top -
      pointerOffsetY,
  );
}

function finishDrag(event) {
  if (
    !activeCard ||
    event.currentTarget !== activeCard
  ) {
    return;
  }

  const releasedCard = activeCard;

  if (
    activeCard.hasPointerCapture(
      event.pointerId,
    )
  ) {
    activeCard.releasePointerCapture(
      event.pointerId,
    );
  }

  activeCard.classList.remove("is-active");

  document.body.classList.remove(
    "is-dragging",
  );

  activeCard = null;

  if (
    !cardWasDragged &&
    event.type === "pointerup"
  ) {
    openProject(releasedCard);
  }
}

/* CONTROL CON TECLADO */

function onCardKeydown(event) {
  const step = event.shiftKey ? 24 : 8;
  const card = event.currentTarget;

  let left = card.offsetLeft;
  let top = card.offsetTop;

  if (event.key === "ArrowLeft") {
    left -= step;
  } else if (event.key === "ArrowRight") {
    left += step;
  } else if (event.key === "ArrowUp") {
    top -= step;
  } else if (event.key === "ArrowDown") {
    top += step;
  } else if (
    event.key === "Enter" ||
    event.key === " "
  ) {
    event.preventDefault();
    openProject(card);
    return;
  } else {
    return;
  }

  event.preventDefault();

  bringToFront(card);
  moveCard(card, left, top);

  liveRegion.textContent =
    `Image moved to ${Math.round(
      card.offsetLeft,
    )}, ${Math.round(card.offsetTop)}`;
}

/* DETECTAR SI EL ARCHIVO ES UN VÍDEO */

function isVideoFile(source) {
  return /\.(mp4|webm|ogg|mov)(?:$|[?#])/i.test(
    source,
  );
}

/* ABRIR PROYECTO */

function openProject(card) {
  if (projectDialog.open) return;

  const captionParts =
    card.querySelectorAll(
      "figcaption span",
    );

  const sourceImage =
    card.querySelector("img");

  projectNumber.textContent =
    captionParts[0]?.textContent || "";

  projectTitle.textContent =
    captionParts[1]?.textContent ||
    "Project";

  projectYear.textContent =
    captionParts[2]?.textContent || "";

  projectDescription.textContent =
    card.dataset.description || "";

  projectImages = card.dataset.images
    ? card.dataset.images
        .split("|")
        .map((source) => source.trim())
        .filter(Boolean)
    : [sourceImage.getAttribute("src")];

  projectImageAlt =
    sourceImage.alt ||
    projectTitle.textContent;

  currentProjectImage = 0;
  lastOpenedCard = card;

  showProjectImage(false);

  /*
    Precarga solamente las imágenes.
    Los vídeos se cargan al mostrarlos.
  */

  projectImages
    .slice(1)
    .forEach((source) => {
      if (!isVideoFile(source)) {
        const preloadImage =
          new Image();

        preloadImage.src = source;
      }
    });

  document.body.classList.add(
    "modal-open",
  );

  projectDialog.showModal();
  projectClose.focus();
}

/* MOSTRAR IMAGEN O VÍDEO */

function showProjectImage(animate = true) {
  if (projectImages.length === 0) {
    return;
  }

  window.clearTimeout(galleryTimer);

  if (projectVideo) {
    projectVideo.pause();
  }

  const applyMedia = () => {
    const source =
      projectImages[currentProjectImage];

    const isVideo =
      isVideoFile(source);

    if (isVideo && projectVideo) {
      /*
        Ocultar imagen y mostrar vídeo.
      */

      projectImage.hidden = true;
      projectVideo.hidden = false;

      projectImage.removeAttribute(
        "src",
      );

      projectVideo.src = source;

      projectVideo.setAttribute(
        "aria-label",
        `${projectImageAlt} — video ${
          currentProjectImage + 1
        } of ${projectImages.length}`,
      );

      projectVideo.load();
    } else {
      /*
        Ocultar vídeo y mostrar imagen.
      */

      if (projectVideo) {
        projectVideo.pause();
        projectVideo.hidden = true;

        projectVideo.removeAttribute(
          "src",
        );

        projectVideo.load();
      }

      projectImage.hidden = false;
      projectImage.src = source;

      projectImage.alt =
        `${projectImageAlt} — image ${
          currentProjectImage + 1
        } of ${projectImages.length}`;
    }

    projectCounter.textContent =
      `${String(
        currentProjectImage + 1,
      ).padStart(2, "0")} / ` +
      `${String(
        projectImages.length,
      ).padStart(2, "0")}`;

    const onlyOneFile =
      projectImages.length <= 1;

    projectPrevious.disabled =
      onlyOneFile;

    projectNext.disabled =
      onlyOneFile;

    projectImage.classList.remove(
      "is-changing",
    );

    if (projectVideo) {
      projectVideo.classList.remove(
        "is-changing",
      );
    }
  };

  if (animate) {
    projectImage.classList.add(
      "is-changing",
    );

    if (projectVideo) {
      projectVideo.classList.add(
        "is-changing",
      );
    }

    galleryTimer =
      window.setTimeout(
        applyMedia,
        130,
      );
  } else {
    applyMedia();
  }
}

/* ANTERIOR Y SIGUIENTE */

function previousProjectImage() {
  if (projectImages.length <= 1) {
    return;
  }

  currentProjectImage =
    (
      currentProjectImage -
      1 +
      projectImages.length
    ) % projectImages.length;

  showProjectImage();
}

function nextProjectImage() {
  if (projectImages.length <= 1) {
    return;
  }

  currentProjectImage =
    (
      currentProjectImage + 1
    ) % projectImages.length;

  showProjectImage();
}

/* CERRAR PROYECTO */

function closeProject() {
  if (projectDialog.open) {
    projectDialog.close();
  }
}

/* SCATTER */

function scatterCards() {
  cards.forEach((card, index) => {
    const bounds = boundsFor(card);

    const left =
      bounds.minX +
      Math.random() *
        (bounds.maxX - bounds.minX);

    const top =
      bounds.minY +
      Math.random() *
        (bounds.maxY - bounds.minY);

    moveCard(card, left, top);

    card.style.transform =
      `rotate(${(
        Math.random() * 8 - 4
      ).toFixed(1)}deg)`;

    card.style.zIndex = 4 + index;
  });

  highestLayer = 10;

  liveRegion.textContent =
    "The images have been scattered.";
}

/* RESET */

function resetCards() {
  cards.forEach((card, index) => {
    const initial =
      initialPositions.get(card);

    if (!initial) return;

    moveCard(
      card,
      initial.left,
      initial.top,
    );

    card.style.transform =
      initial.transform === "none"
        ? "none"
        : initial.transform;

    card.style.zIndex = 4 + index;
  });

  highestLayer = 10;

  liveRegion.textContent =
    "The image layout has been reset.";
}

/* PANEL DE INFORMACIÓN */

function openInfo() {
  infoPanel.classList.add("is-open");

  backdrop.classList.add(
    "is-visible",
  );

  infoPanel.setAttribute(
    "aria-hidden",
    "false",
  );

  document
    .querySelector("[data-info-close]")
    .focus();
}

function closeInfo() {
  infoPanel.classList.remove(
    "is-open",
  );

  backdrop.classList.remove(
    "is-visible",
  );

  infoPanel.setAttribute(
    "aria-hidden",
    "true",
  );

  infoTrigger.focus();
}

/* EVENTOS DE LAS TARJETAS */

cards.forEach((card) => {
  card.addEventListener(
    "pointerdown",
    onPointerDown,
  );

  card.addEventListener(
    "pointermove",
    onPointerMove,
  );

  card.addEventListener(
    "pointerup",
    finishDrag,
  );

  card.addEventListener(
    "pointercancel",
    finishDrag,
  );

  card.addEventListener(
    "keydown",
    onCardKeydown,
  );
});

/* BOTONES PRINCIPALES */

resetButton.addEventListener(
  "click",
  resetCards,
);

shuffleButton.addEventListener(
  "click",
  scatterCards,
);

infoTrigger.addEventListener(
  "click",
  openInfo,
);

infoClosers.forEach((closer) => {
  closer.addEventListener(
    "click",
    closeInfo,
  );
});

/* BOTONES DEL POP-UP */

projectClose.addEventListener(
  "click",
  closeProject,
);

projectPrevious.addEventListener(
  "click",
  previousProjectImage,
);

projectNext.addEventListener(
  "click",
  nextProjectImage,
);

/* CERRAR AL PULSAR FUERA */

projectDialog.addEventListener(
  "click",
  (event) => {
    if (event.target === projectDialog) {
      closeProject();
    }
  },
);

/* LIMPIAR AL CERRAR EL POP-UP */

projectDialog.addEventListener(
  "close",
  () => {
    window.clearTimeout(galleryTimer);

    document.body.classList.remove(
      "modal-open",
    );

    projectImage.removeAttribute(
      "src",
    );

    projectImage.hidden = false;

    if (projectVideo) {
      projectVideo.pause();

      projectVideo.removeAttribute(
        "src",
      );

      projectVideo.load();
      projectVideo.hidden = true;
    }

    projectImages = [];
    currentProjectImage = 0;

    if (lastOpenedCard) {
      lastOpenedCard.focus();
    }
  },
);

/* CONTROL CON FLECHAS Y ESCAPE */

document.addEventListener(
  "keydown",
  (event) => {
    if (
      projectDialog.open &&
      event.key === "ArrowLeft"
    ) {
      event.preventDefault();
      previousProjectImage();
      return;
    }

    if (
      projectDialog.open &&
      event.key === "ArrowRight"
    ) {
      event.preventDefault();
      nextProjectImage();
      return;
    }

    if (
      event.key === "Escape" &&
      infoPanel.classList.contains(
        "is-open",
      )
    ) {
      closeInfo();
    }
  },
);

/* AJUSTAR TARJETAS AL CAMBIAR TAMAÑO */

window.addEventListener(
  "resize",
  () => {
    cards.forEach((card) => {
      moveCard(
        card,
        card.offsetLeft,
        card.offsetTop,
      );
    });
  },
);

/* INICIO */

window.addEventListener(
  "load",
  rememberInitialPositions,
  { once: true },
);