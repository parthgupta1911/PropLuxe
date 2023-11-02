document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the form from submitting traditionally

    const name = document.querySelector("#username").value;
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;

    // Create an object with the data to send to the API
    const data = {
      name: name,
      email: email,
      password: password,
    };

    // Make an API request (you can use the Fetch API or any other library)
    fetch("localhost:3000/api/v1/users/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Failed to make the API request.");
        }
      })
      .then((data) => {
        // Handle the response from the API (e.g., show a success message)
        console.log("API response:", data);
      })
      .catch((error) => {
        // Handle errors (e.g., show an error message)
        console.error("API request error:", error);
      });
  });
});
