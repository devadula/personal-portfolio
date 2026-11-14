const res = await fetch("http://localhost:3000/api/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Portfolio QA test",
    email: "janeshdevadula8@gmail.com",
    subject: "QA re-test of the contact form",
    type: "Website Development",
    budget: "n/a",
    timeline: "n/a",
    message: "This is an automated end-to-end re-test of the portfolio contact form. Please ignore it.",
    website: "",
    elapsed: 4000,
  }),
});
console.log("status:", res.status);
console.log("body:", await res.text());
