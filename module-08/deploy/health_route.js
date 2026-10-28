// Used by the deployment checks: answers 200 while the process is running.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
