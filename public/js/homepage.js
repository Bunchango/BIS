const openModalButtons = document.querySelectorAll("[data-modal-target]");
const closeModalButtons = document.querySelectorAll("[data-close-button]");
const overlay = document.getElementById("overlay");

// Open the pop up book mark
async function updateBookmarkPopup() {
  // Send a request to the server to get the updated list of bookmarks
  const response = await fetch("/reader/wishlist", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const bookmarks = await response.json();
  if (bookmarks.length > 0) {
    // Clear the current popup content
    const list = document.querySelector(".pop-up-modal .list");
    list.innerHTML = "";

    // Add the updated bookmarks to the popup
    bookmarks.forEach((bookmark) => {
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
    });
  }
  // Remove the book from the wishlist
  // TODO: remove the book from the wish list , update the data when out pop up window
  const removeBookmarks = document.querySelectorAll(".pop-up-modal .remove");
  removeBookmarks.forEach((removebtn) => {
    removebtn.addEventListener("click", (event) => {
      console.log("click");
      // Prevent the default action
      event.preventDefault();
      const bookId = event.currentTarget.dataset.bookid;
      const itemDiv = event.currentTarget.closest(".item");
      console.log(bookId);
      fetch(`/reader/wishlist/${bookId}?action=remove`, {
        method: "POST",
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          // TODO : Update the corresponding book mark icon
          if (data.success) {
            // Remove the itemDiv
            itemDiv.remove();

            // Check if the list is empty
            const list = document.querySelector(".pop-up-modal .list");
            if (list.children.length === 0) {
              // Append the "Empty" div to the list
              list.innerHTML = '<div id="empty-bookmark">Empty</div>';
            }
            // TODO: Change the class of target icon, if the dataset.bookid == clicked bookId remove the class contain 'fas' to 'far'
            // Change the class of target icon
            const icons = document.querySelectorAll(".bookmark-icon");
            icons.forEach((icon) => {
              if (icon.dataset.bookid === bookId) {
                icon.classList.remove("fas");
                icon.classList.add("far");
              }
            });
          } else {
            console.log("Error:", data.error);
            console.log("Fail to remove from wishlist");
          }
        })
        .catch((error) =>
          console.error(
            "There has been a problem with your fetch operation: ",
            error,
          ),
        );
    });
  });
}

openModalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modal = document.querySelector(button.dataset.modalTarget);
    openModal(modal);
    updateBookmarkPopup().catch(console.error);
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

// Get all the icon elements
const icons = document.querySelectorAll(".bookmark-icon");

icons.forEach((icon) => {
  icon.addEventListener("click", (event) => {
    console.log("click");
    // Prevent the default action
    event.preventDefault();
    const bookId = event.target.dataset.bookid;
    console.log(bookId);

    if (icon.classList.contains("far")) {
      // add to wishlist
      fetch(`/reader/wishlist/${bookId}?action=add`, {
        method: "POST",
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          if (data.success) {
            icon.classList.remove("far");
            icon.classList.add("fas");
          } else {
            console.log(data.success);
            console.log("Error:", data.error);
            console.log("fail to add to wishlist");
          }
        })
        .catch((error) =>
          console.error(
            "There has been a problem with your fetch operation: ",
            error,
          ),
        );
    } else if (icon.classList.contains("fas")) {
      fetch(`/reader/wishlist/${bookId}?action=remove`, {
        method: "POST",
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          if (data.success) {
            icon.classList.remove("fas");
            icon.classList.add("far");
          } else {
            console.log("Error:", data.error);
            console.log("fail to remove from wishlist");
          }
        })
        .catch((error) =>
          console.error(
            "There has been a problem with your fetch operation: ",
            error,
          ),
        );
    }
  });
});

// TODO: Remove from my wishlist in the profile
