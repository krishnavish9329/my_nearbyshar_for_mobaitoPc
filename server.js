// import express from "express";
// import multer from "multer";
// import fs from "fs";
// import path from "path";
// import os from "os";
// import QRCode from "qrcode";
// import cors from "cors";
// import { nanoid } from "nanoid";

// const app = express();
// const PORT = 5050;
// const HOST = "0.0.0.0";
// const UPLOAD_DIR = path.join(process.cwd(), "uploads");
// const PUBLIC_DIR = path.join(process.cwd(), "public");

// // Ensure uploads folder exists
// fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// // ---------- Middleware ----------
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.static(PUBLIC_DIR));
// app.use("/uploads", express.static(UPLOAD_DIR)); // allow public download

// // Disable all timeouts
// app.use((req, res, next) => {
//   req.setTimeout(0); // disable request timeout
//   res.setTimeout(0); // disable response timeout
//   next();
// });

// // ---------- Multer Config ----------
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
//   filename: (_req, file, cb) => {
//     const id = nanoid(6);
//     const safeName = file.originalname.replace(/[^\w.\-() ]/g, "_");
//     cb(null, `${id}_${safeName}`);
//   },
// });

// // 🚀 No file size limit
// const upload = multer({ storage });

// // ---------- Helper: LAN IP ----------
// function getLanIP() {
//   const nets = os.networkInterfaces();
//   for (const name of Object.keys(nets)) {
//     for (const net of nets[name] || []) {
//       if (net.family === "IPv4" && !net.internal) return net.address;
//     }
//   }
//   return "localhost";
// }

// // ---------- Routes ----------

// // Upload page
// app.get("/", (req, res) => {
//   res.sendFile(path.join(PUBLIC_DIR, "index.html"));
// });

// // File list page
// app.get("/files", (req, res) => {
//   res.sendFile(path.join(PUBLIC_DIR, "files.html"));
// });

// // Upload API (multi-file)
// app.post("/api/upload", upload.array("files"), (req, res) => {
//   try {
//     if (!req.files?.length) {
//       return res.status(400).json({ ok: false, msg: "No files uploaded" });
//     }
//     res.json({
//       ok: true,
//       uploaded: req.files.map((f) => ({
//         name: f.originalname,
//         size: f.size,
//         path: `/uploads/${path.basename(f.filename)}`,
//       })),
//     });
//   } catch (err) {
//     console.error("❌ Upload error:", err);
//     res.status(500).json({ ok: false, msg: err.message });
//   }
// });

// // Get file list API
// app.get("/api/files", (req, res) => {
//   try {
//     const files = fs.readdirSync(UPLOAD_DIR).map((f) => {
//       const full = path.join(UPLOAD_DIR, f);
//       const stat = fs.statSync(full);
//       return {
//         name: f,
//         size: stat.size,
//         time: stat.mtime,
//         url: `/uploads/${encodeURIComponent(f)}`,
//       };
//     });
//     res.json({ ok: true, files });
//   } catch (err) {
//     res.status(500).json({ ok: false, msg: err.message });
//   }
// });

// // Delete file API
// app.delete("/api/files/:name", (req, res) => {
//   try {
//     const file = path.join(UPLOAD_DIR, req.params.name);
//     if (!fs.existsSync(file))
//       return res.status(404).json({ ok: false, msg: "Not found" });
//     fs.unlinkSync(file);
//     res.json({ ok: true });
//   } catch (err) {
//     res.status(500).json({ ok: false, msg: err.message });
//   }
// });

// // QR Code API (for mobile scan)
// app.get("/api/qr", async (req, res) => {
//   const ip = getLanIP();
//   const url = `http://${ip}:${PORT}/`;
//   const qr = await QRCode.toDataURL(url);
//   res.json({ ok: true, url, qr });
// });

// // ---------- Start Server ----------
// const server = app.listen(PORT, HOST, () => {
//   console.log(`\n🌐 PFT Share is running...`);
//   console.log(`➡️  Open on PC: http://${getLanIP()}:${PORT}/`);
//   console.log(`📱 Or scan QR from phone to upload/download.`);
// });

// // Disable Node.js timeout completely
// server.timeout = 0;
// server.keepAliveTimeout = 0;
// server.headersTimeout = 0;


// =====================================================
// 📦 PFT Share — Ultra Large File Transfer (10–20 GB+)
// =====================================================

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import QRCode from "qrcode";
import cors from "cors";
import { nanoid } from "nanoid";
import Busboy from "busboy"; // ✅ streaming upload

const app = express();
const PORT = 5050;
const HOST = "0.0.0.0";
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const PUBLIC_DIR = path.join(process.cwd(), "public");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOAD_DIR));

// Disable all timeouts
app.use((req, res, next) => {
  req.setTimeout(0);
  res.setTimeout(0);
  next();
});

// ---------- Helper: LAN IP ----------
function getLanIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

// ---------- Routes ----------

// Upload page
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// File list page
app.get("/files", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "files.html"));
});

// ⚙️ Stream-based upload (supports 20GB+)
app.post("/api/upload", (req, res) => {
  try {
    const busboy = Busboy({ headers: req.headers });
    const uploaded = [];

    busboy.on("file", (name, file, info) => {
      const { filename } = info;
      const id = nanoid(6);
      const safeName = filename.replace(/[^\w.\-() ]/g, "_");
      const savePath = path.join(UPLOAD_DIR, `${id}_${safeName}`);

      const stream = fs.createWriteStream(savePath);
      let size = 0;

      file.on("data", (data) => {
        size += data.length;
      });

      file.pipe(stream);

      file.on("end", () => {
        uploaded.push({
          name: safeName,
          size,
          path: `/uploads/${id}_${safeName}`,
        });
      });
    });

    busboy.on("finish", () => {
      res.json({ ok: true, uploaded });
    });

    req.pipe(busboy);
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ ok: false, msg: err.message });
  }
});

// Get file list API
app.get("/api/files", (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).map((f) => {
      const full = path.join(UPLOAD_DIR, f);
      const stat = fs.statSync(full);
      return {
        name: f,
        size: stat.size,
        time: stat.mtime,
        url: `/uploads/${encodeURIComponent(f)}`,
      };
    });
    res.json({ ok: true, files });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

// Delete file API
app.delete("/api/files/:name", (req, res) => {
  try {
    const file = path.join(UPLOAD_DIR, req.params.name);
    if (!fs.existsSync(file))
      return res.status(404).json({ ok: false, msg: "Not found" });
    fs.unlinkSync(file);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

// QR Code API (for mobile scan)
app.get("/api/qr", async (req, res) => {
  const ip = getLanIP();
  const url = `http://${ip}:${PORT}/`;
  const qr = await QRCode.toDataURL(url);
  res.json({ ok: true, url, qr });
});

// ---------- Start Server ----------
const server = app.listen(PORT, HOST, () => {
  console.log(`\n🌐 PFT Share (Large File Edition) is running...`);
  console.log(`➡️  Open on PC: http://${getLanIP()}:${PORT}/`);
  //sconsole.log(`📱 Scan QR to access from your phone.`);
});

// No timeout anywhere
server.timeout = 0;
server.keepAliveTimeout = 0;
server.headersTimeout = 0;
