import type { FlowmaidProgram } from "./domain/types"
import { mountFlowmaid, type FlowmaidMount, type MountDependencies } from "./runtime/mount"

export const createFlowmaidEngine = (dependencies: MountDependencies = {}) => ({
  mount(container: HTMLElement, svg: SVGSVGElement, program: FlowmaidProgram): FlowmaidMount {
    return mountFlowmaid(container, svg, program, dependencies)
  },
})
