import {ShapeView} from './shape-view';
import type {ShapeCreatedCallback} from './shape-view';

export {ShapeView} from './shape-view';
export type {ShapeCreatedCallback} from './shape-view';
export {SHAPE_BUTTONS} from './types';
export type {ShapeButtonConfig} from './types';


export function createShapeView(
  containerId: string,
  onShapeCreated: ShapeCreatedCallback
): ShapeView {
  return new ShapeView(containerId, onShapeCreated);
}