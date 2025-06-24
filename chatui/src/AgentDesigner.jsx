/**
 * AgentDesigner.jsx - Visual Agent Flow Designer
 *
 * This component provides a simple drag-and-drop interface for visually designing agent flows.
 * Users can drag blocks (Node, Edge, Start, End, Conditional) from the palette onto the canvas.
 * Each block dropped on the canvas is positioned at the drop location and rendered as an element.
 *
 * Author: Vikrama Aditya Bharatula
 * Date: 2025-06-24
 */

import React, { useState } from 'react';
import './App.css';

// =========================
// Block Palette Definition
// =========================
const BLOCKS = [
  { type: 'Node', label: 'Node' },
  { type: 'Edge', label: 'Edge' },
  { type: 'Start', label: 'Start' },
  { type: 'End', label: 'End' },
  { type: 'Conditional', label: 'Conditional' },
];

/**
 * AgentDesigner component
 * @param {object} props
 * @param {object} props.theme - Theme object (optional, for future use)
 */
export default function AgentDesigner({ theme }) {
  // State: List of elements on the canvas
  const [elements, setElements] = useState([]);

  // =========================
  // Drag-and-Drop Handlers
  // =========================
  /**
   * Handler for drag start from palette
   * @param {DragEvent} e
   * @param {string} type - Block type
   */
  const onDragStart = (e, type) => {
    e.dataTransfer.setData('blockType', type);
  };

  /**
   * Handler for drop on canvas
   * Adds a new element at the drop location
   * @param {DragEvent} e
   */
  const onDrop = (e) => {
    const type = e.dataTransfer.getData('blockType');
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setElements([...elements, { type, x, y, id: Date.now() }]);
  };

  /**
   * Handler to allow drop on canvas
   * @param {DragEvent} e
   */
  const onDragOver = (e) => e.preventDefault();

  // =========================
  // Render
  // =========================
  return (
    <div className="agentdesigner-root">
      {/* Palette: List of draggable blocks */}
      <div className="agentdesigner-palette">
        <h3>Blocks</h3>
        {BLOCKS.map(block => (
          <div
            key={block.type}
            draggable
            onDragStart={e => onDragStart(e, block.type)}
            className="agentdesigner-block"
          >
            {block.label}
          </div>
        ))}
      </div>
      {/* Canvas: Drop area for blocks */}
      <div
        className="agentdesigner-canvas"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        {elements.map(el => (
          <div
            key={el.id}
            className="agentdesigner-element"
            style={{ left: el.x, top: el.y }}
          >
            {el.type}
          </div>
        ))}
      </div>
    </div>
  );
}
