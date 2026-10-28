const express = require("express");
const { z } = require("zod");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(express.json());
app.use(express.static("public"));

const records = [
  { id: 1, citizenId: "CIT-10000001", status: "SUBMITTED" },
  { id: 2, citizenId: "CIT-10000002", status: "APPROVED" },
];
let nextId = 3;

const recordSchema = z.object({
  citizenId: z.string().regex(/^CIT-\d{8}$/),
  status: z.enum(["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"]),
});

function validationError(result) {
  return {
    error: {
      message: "Invalid request body",
      fields: result.error.issues.map((i) => ({
        field: i.path.join("."),
        issue: i.message,
      })),
    },
  };
}

const router = express.Router();

router.get("/records", (req, res) => {
  res.json(records);
});

router.get("/records/:id", (req, res) => {
  const record = records.find((r) => r.id === Number(req.params.id));
  if (!record) return res.status(404).json({ error: { message: "Record not found" } });
  res.json(record);
});

router.post("/records", (req, res) => {
  const result = recordSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json(validationError(result));
  const newRecord = { id: nextId++, ...result.data };
  records.push(newRecord);
  res.status(201).json(newRecord);
});

router.put("/records/:id", (req, res) => {
  const index = records.findIndex((r) => r.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: { message: "Record not found" } });
  const result = recordSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json(validationError(result));
  records[index] = { id: records[index].id, ...result.data };
  res.json(records[index]);
});

router.delete("/records/:id", (req, res) => {
  const index = records.findIndex((r) => r.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: { message: "Record not found" } });
  records.splice(index, 1);
  res.status(200).json({ message: "Deleted" });
});

app.use("/v1", router);

app.use((req, res) => {
  res.status(404).json({ error: { message: "Route not found" } });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { message: "Request body is not valid JSON" } });
  }
  console.error(err);
  res.status(500).json({ error: { message: "Something went wrong on the server" } });
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
