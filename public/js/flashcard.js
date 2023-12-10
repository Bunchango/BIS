const contElements = document.querySelectorAll(".cont");
contElements.forEach((cont) => {
  const preInsideCont = cont.querySelector(".rotate"); // Use a different variable name
  let isMouseInside = false;

  cont.addEventListener("mouseenter", () => {
    isMouseInside = true;
  });

  cont.addEventListener("mouseleave", () => {
    isMouseInside = false;
    preInsideCont.style.setProperty("--rotateX", "0deg");
    preInsideCont.style.setProperty("--rotateY", "0deg");
  });

  cont.addEventListener("mousemove", (e) => {
    if (isMouseInside) {
      rotateElement(e, preInsideCont, cont);
    }
  });
});

function rotateElement(event, element, cont) {
  // get mouse position
  const x = event.clientX;
  const y = event.clientY;

  // get the position and dimensions of the .cont element
  const rect = cont.getBoundingClientRect();
  const elementX = rect.left;
  const elementY = rect.top;
  const elementWidth = rect.width;
  const elementHeight = rect.height;

  // find the middle
  const middleX = elementX + elementWidth / 2;
  const middleY = elementY + elementHeight / 2;

  // get offset from middle as a percentage
  // and tone it down a little
  const offsetX = ((x - middleX) / middleX) * 45;
  const offsetY = ((y - middleY) / middleY) * 45;

  // set rotation
  element.style.setProperty("--rotateX", offsetX + "deg");
  element.style.setProperty("--rotateY", -1 * offsetY + "deg");
}

const cards = document.querySelectorAll(".card__inner");
cards.forEach((card) => {
    card.addEventListener("click", function (e) {
        card.classList.toggle('is-flipped');
      });
    }
)

