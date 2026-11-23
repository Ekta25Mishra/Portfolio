import sketch from './assets/girl-sketch.png';

export default function GirlSketch({ small = false }) {
  return (
    <img
      className={`girl-sketch${small ? ' girl-sketch-small' : ''}`}
      src={sketch}
      alt="Line-art illustration of a woman in profile with long, flowing hair"
      draggable="false"
    />
  );
}
