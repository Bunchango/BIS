// TODO: Handle Remove book from Cart buttons
function setupRemoveButtons() {
  const removeButtons = document.querySelectorAll(".remove-cart-btn");

  removeButtons.forEach((removeBtn) => {
    removeBtn.addEventListener("click", async (event) => {
      event.preventDefault();

      const cartId = event.currentTarget.dataset.cartid;
      const bookId = event.currentTarget.dataset.bookid;

      console.log("Clicked Remove Button");
      console.log("Cart ID:", cartId);
      console.log("Book ID:", bookId);

      try {
        const response = await fetch(
          `/reader/remove-cart/${cartId}/${bookId}`,
          {
            method: "POST",
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();

        if (data.message === "Book removed from cart successfully") {
          // Remove the UI element for the book
          const bookElement = event.currentTarget.closest(".book-item");
          if (bookElement) {
            bookElement.remove();

            location.reload();

            console.log("Book removed from UI successfully");
          } else {
            console.log("Book UI element not found");
          }

          console.log("Book removed from cart successfully");
        } else {
          console.error("Error:", data.error);
        }
      } catch (error) {
        console.error(
          "There has been a problem with your fetch operation:",
          error,
        );
      }
    });
  });
}

function setupSendRequestButtons() {
  const sendRequestButtons = document.querySelectorAll(".send-request-btn");

  sendRequestButtons.forEach((sendRequestBtn) => {
    sendRequestBtn.addEventListener("click", async (event) => {
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

        if (data.message === "Request sent successfully") {
          const cartElement = event.currentTarget.closest(".cart-item");
          if (cartElement) {
            cartElement.remove();

            location.reload();

            console.log("Cart removed from UI successfully");
          }
        } else {
          console.error("Error:", data.error);
        }
      } catch (error) {
        console.error(
          "There has been a problem with your fetch operation:",
          error,
        );
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoaded event triggered");
  setupRemoveButtons();
  setupSendRequestButtons();
});
