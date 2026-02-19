/** On-chain user location in the ainspace village */
export interface UserLocation {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  scene: 'village' | 'course';
  paperId?: string;
  stageIndex?: number;
  updatedAt: number;
}

/** On-chain course entrance position on the village map */
export interface CourseLocation {
  paperId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
  registeredAt: number;
}
