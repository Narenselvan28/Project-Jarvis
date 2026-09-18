import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./styles/factory.css";
import App from "./App";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
