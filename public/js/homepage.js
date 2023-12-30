// open the account hovering
const accountWindow = document.querySelector("#account-hovering");
const avaImage = document.querySelector("#account_img");
const account = document.querySelector("#account");
if (avaImage) {
  avaImage.addEventListener("click", () => {
    const computedStyle = window.getComputedStyle(accountWindow);
    if (computedStyle.display === "none") {
      // Change the display style to 'block'
      accountWindow.style.display = "block";
    } else {
      accountWindow.style.display = "none";
    }
  });
}

// Open the pop up book mark
const openModalButtons = document.querySelectorAll(
  "[data-modal-target]:not(.submit-button)",
); // peevent the summit button
const closeModalButtons = document.querySelectorAll("[data-close-button]");
const overlay = document.getElementById("overlay");

async function updateBookmarkPopup() {
  const response = await fetch("/reader/wishlist", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const bookmarks = await response.json();
  const list = document.querySelector(".pop-up-modal .list");
  list.innerHTML = "";

  if (bookmarks.length > 0) {
    bookmarks.forEach((bookmark) => createBookmarkElement(list, bookmark));
  } else {
    list.innerHTML = '<div id="empty-bookmark">Empty</div>';
  }

  document.querySelectorAll(".pop-up-modal .remove").forEach((removebtn) => {
    removebtn.addEventListener("click", removeBookmark);
  });
}

function createBookmarkElement(list, bookmark) {
  const bookmarkElement = document.createElement("div");
  bookmarkElement.className = "item";
  bookmarkElement.innerHTML = `
    <div class="img">
      <img src="/${bookmark.coverImages[0]}" alt="${bookmark.title}'s Picture">
    </div>
    <div class="content">
      <div class="title">${bookmark.title}</div>
      <div class="des">${bookmark.description}</div>
      <button class="remove" data-bookid="${bookmark._id}"><i class="fa-solid fa-trash"></i></button>
      <a id="view-detail" href="/reader/book_detail/${bookmark._id}">View</a>
    </div>
  `;
  list.appendChild(bookmarkElement);
}

async function removeBookmark(event) {
  event.preventDefault();
  const bookId = event.currentTarget.dataset.bookid;
  const itemDiv = event.currentTarget.closest(".item");

  const response = await fetch(`/reader/wishlist/${bookId}?action=remove`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = await response.json();
  if (data.success) {
    itemDiv.remove();
    const list = document.querySelector(".pop-up-modal .list");
    if (list.children.length === 0) {
      list.innerHTML = '<div id="empty-bookmark">Empty</div>';
    }

    document.querySelectorAll(".bookmark-icon").forEach((icon) => {
      if (icon.dataset.bookid === bookId) {
        icon.classList.remove("fas");
        icon.classList.add("far");
      }
    });

    document.querySelectorAll("#my-wishlist .item").forEach((div) => {
      if (div.dataset.bookid == bookId) {
        div.remove();
      }
    });

    const listOfbookmark = document.querySelector("#my-wishlist ul");
    if (listOfbookmark.children.length === 0) {
      listOfbookmark.innerHTML =
        '<div id="empty-container">Your WishList Empty</div>';
    }
  } else {
    console.log("Fail to remove from wishlist");
  }
}

openModalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modal = document.querySelector(button.dataset.modalTarget);
    updateBookmarkPopup().catch(console.error);
    openModal(modal);
  });
});

overlay.addEventListener("click", () => {
  const modals = document.querySelectorAll(".pop-up-modal.active");
  modals.forEach((modal) => {
    closeModal(modal);
  });
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modal = button.closest(".pop-up-modal");
    closeModal(modal);
    const successModel = button.closest(".pop-up-success"); // If there is a success model
    successModel.classList.remove("active");
  });
});

function openModal(modal) {
  if (modal == null) return;
  modal.classList.add("active");
  overlay.classList.add("active");
}

function closeModal(modal) {
  if (modal == null) return;
  modal.classList.remove("active");
  overlay.classList.remove("active");
}

// Click event handler for bookmark icons
document.querySelectorAll(".bookmark-icon").forEach((icon) => {
  icon.addEventListener("click", handleIconClick);
});

// Click event handler for remove buttons in the wishlist
document.querySelectorAll("#my-wishlist .remove").forEach((removeBtn) => {
  removeBtn.addEventListener("click", handleRemoveBtnClick);
});

async function handleIconClick(event) {
  event.preventDefault();
  const bookId = event.target.dataset.bookid;

  if (event.target.classList.contains("far")) {
    await updateWishlist(bookId, "add", event.target);
  } else if (event.target.classList.contains("fas")) {
    await updateWishlist(bookId, "remove", event.target);
  }
}

async function handleRemoveBtnClick(event) {
  event.preventDefault();
  const bookId = event.currentTarget.dataset.bookid;

  const response = await fetch(`/reader/wishlist/${bookId}?action=remove`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = await response.json();
  if (data.success) {
    updateWishlistUI(bookId);
  } else {
    console.log("Fail to remove from wishlist");
  }
}

async function updateWishlist(bookId, action, targetIcon) {
  const response = await fetch(`/reader/wishlist/${bookId}?action=${action}`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = await response.json();
  if (data.success) {
    toggleIconClass(targetIcon);
  }
}

function toggleIconClass(targetIcon) {
  targetIcon.classList.toggle("far");
  targetIcon.classList.toggle("fas");
}

function updateWishlistUI(bookId) {
  document
    .querySelector(`#my-wishlist .remove[data-bookid="${bookId}"]`)
    .closest(".item")
    .remove();
  const list = document.querySelector("#my-wishlist ul");
  if (list.children.length === 0) {
    list.innerHTML = '<div id="empty-container">Your WishList Empty</div>';
  }
}

