import React from 'react';

function renderNotes(notes) {
  if (!notes) return null;
  const lines = notes.split('\n');
  const elements = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('### ') || line.startsWith('## ')) {
      const text = line.replace(/^#+\s*/, '');
      elements.push(<div key={key++} className="whats-new-section-title">{text}</div>);
    } else if (line.startsWith('- ')) {
      elements.push(
        <div key={key++} className="whats-new-item">
          <span className="whats-new-bullet">▸</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: '6px' }} />);
    } else {
      elements.push(<div key={key++} className="whats-new-text">{line}</div>);
    }
  }

  return elements;
}

export default function WhatsNew({ version, notes, onClose }) {
  if (!version) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="whats-new-modal" onClick={e => e.stopPropagation()}>
        <div className="whats-new-hero">
          <div className="whats-new-hero-glow" />
          <div className="whats-new-badge">✦ NEW</div>
          <h2 className="whats-new-title">What's new in <span className="whats-new-version">{version}</span></h2>
        </div>

        <div className="whats-new-body">
          {renderNotes(notes)}
        </div>

        <div className="whats-new-footer">
          <button className="btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
