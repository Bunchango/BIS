// Click event handler for remove buttons in cart
document.querySelectorAll("#my-cart .remove-cart-btn").forEach((removeBtn) => {
  removeBtn.addEventListener("click", handleRemoveCartBtn);
});

async function handleRemoveCartBtn(event) {
  event.preventDefault();
  const bookId = event.currentTarget.dataset.bookid;
  const cartId = event.currentTarget.dataset.cartid;

  try {
    const response = await fetch(`/reader/remove-cart/${cartId}/${bookId}`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    if (data.message === "Book removed from cart successfully") {
      updateBookUi(bookId, cartId);
    } else {
      console.log("Failed to remove book from cart");
    }
  } catch (error) {
    console.error("There has been a problem with your fetch operation:", error);
  }
}

function hasBooksLeftInCart(cartItem) {
  const booksLeftInCart = cartItem.querySelectorAll(".book-item").length;
  return booksLeftInCart > 0;
}

function updateBookUi(bookId, cartId) {
  const bookElement = document.querySelector(
    `#my-cart .book-item[data-bookid="${bookId}"][data-cartid="${cartId}"]`,
  );

  if (bookElement) {
    const cartItem = bookElement.closest(".cart-item");
    bookElement.closest(".book-item").remove();
    console.log("Book removed from UI successfully");

    !hasBooksLeftInCart(cartItem) ? updateCartUi(cartItem) : null;
  } else {
    console.log("Book UI element not found");
  }
}

function updateCartUi(cartItem) {
  cartItem.remove();
  console.log("Cart removed from UI successfully");
}

// Handling sending requests from cart
document.querySelectorAll("#my-cart .send-request-btn").forEach((sendBtn) => {
  sendBtn.addEventListener("click", handleSendRequestBtn);
});

async function handleSendRequestBtn(event) {
  event.preventDefault();
  const cartId = event.currentTarget.dataset.cartid;

  try {
    const response = await fetch(`/reader/cart/request/${cartId}`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    const cartItem = document
      .querySelector(`#my-cart .cart-item[data-cartid="${cartId}"]`)
      .closest(".cart-item");

    if (data.message === "Request sent successfully") {
      updateCartUi(cartItem);
      location.reload();
    } else {
      console.log("Failed to send request");
    }
  } catch (error) {
    console.error("There has been a problem with your fetch operation:", error);
  }
}

// Handling removing requests
document
  .querySelectorAll("#my-requests .cancel-request-btn")
  .forEach((removeBtn) => {
    removeBtn.addEventListener("click", handleCancelRequestBtn);
  });

async function handleCancelRequestBtn(event) {
  event.preventDefault();
  const requestId = event.currentTarget.dataset.requestid;

  try {
    const response = await fetch(`/reader/request/cancel/${requestId}`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    if (data.message === `Request ${requestId} canceled successfully`) {
      window.location.href = "/reader/profile/#my-requests";
    } else {
      console.log("Failed to cancel request");
    }
  } catch (error) {
    console.error("There has been a problem with your fetch operation:", error);
  }
}
