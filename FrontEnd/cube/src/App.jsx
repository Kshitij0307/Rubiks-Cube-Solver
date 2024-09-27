import { useState } from "react";
import "./App.css";
import ColorInput from "./components/ColorInput";

function App() {

  return (
    <div className="glass">
      <h1>Rubiks Cube Solver</h1>
      <ColorInput/>
    </div>
  );
}

export default App;
