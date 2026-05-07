const switchButtons = document.querySelectorAll(".switcher button");
const sourceButtons = document.querySelectorAll(".source-tabs button");

switchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
  });
});

sourceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    sourceButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
  });
});
