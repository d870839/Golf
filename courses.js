window.COURSES = [
  {
    name: "Warm-up",
    par: 2,
    width: 800,
    height: 500,
    ball: [100, 250],
    hole: [700, 250],
    walls: [],
    sand: [],
  },
  {
    name: "The Curve",
    par: 3,
    width: 800,
    height: 500,
    ball: [80, 100],
    hole: [720, 400],
    walls: [
      [400, 0, 20, 380],
    ],
    sand: [
      [480, 360, 100, 80],
    ],
  },
  {
    name: "Threading",
    par: 4,
    width: 800,
    height: 500,
    ball: [80, 250],
    hole: [720, 250],
    walls: [
      [260, 80, 20, 140],
      [260, 280, 20, 140],
      [480, 80, 20, 160],
      [480, 300, 20, 160],
    ],
    sand: [
      [180, 220, 60, 60],
      [560, 220, 80, 60],
    ],
  },
  {
    name: "Crossing Guard",
    par: 3,
    width: 800,
    height: 500,
    ball: [80, 250],
    hole: [720, 250],
    walls: [],
    sand: [],
    movers: [
      { rect: [400, 80, 20, 80], axis: "y", range: 320, period: 220 },
    ],
  },
  {
    name: "Pendulum",
    par: 3,
    width: 800,
    height: 500,
    ball: [80, 250],
    hole: [720, 250],
    walls: [],
    sand: [
      [340, 200, 120, 100],
    ],
    movers: [
      { rect: [100, 100, 20, 300], axis: "x", range: 580, period: 320 },
    ],
  },
  {
    name: "The Gauntlet",
    par: 5,
    width: 800,
    height: 500,
    ball: [80, 80],
    hole: [720, 420],
    walls: [
      [200, 80, 20, 280],
      [400, 140, 20, 280],
    ],
    sand: [
      [120, 280, 60, 80],
      [600, 260, 80, 80],
    ],
    movers: [
      { rect: [550, 80, 20, 60], axis: "y", range: 280, period: 200 },
    ],
  },
];
