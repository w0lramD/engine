import { AnimBinder } from './anim-binder.js';
import { AnimTarget } from '../evaluator/anim-target.js';
import { Entity } from '../../framework/entity.js';
/**
 * @private
 * @class
 * @name DefaultAnimBinder
 * @implements {AnimBinder}
 * @classdesc Implementation of {@link AnimBinder} for animating a skeleton in the graph-node
 * hierarchy.
 */
class DefaultAnimBinder {
    constructor(graph) {
        this.graph = graph;

        if (!graph) return;

        this._mask = null;

        const nodes = { };
        // cache node names so we can quickly resolve animation paths
        const flatten = function (node) {
            nodes[node.name] = node;
            for (let i = 0; i < node.children.length; ++i) {
                flatten(node.children[i]);
            }
        };
        flatten(graph);
        this.nodes = nodes;
        this.targetCache = {};
        // #if _DEBUG
        this.visitedFallbackGraphPaths = {};
        // #endif

        const findMeshInstances = function (node) {

            // walk up to the first parent node of entity type (skips internal nodes of Model)
            let object = node;
            while (object && !(object instanceof Entity)) {
                object = object.parent;
            }

            // get meshInstances from either model or render component
            let meshInstances;
            if (object) {
                if (object.render) {
                    meshInstances = object.render.meshInstances;
                } else if (object.model) {
                    meshInstances = object.model.meshInstances;
                }
            }
            return meshInstances;
        };

        this.nodeCounts = {};                 // map of node path -> count
        this.activeNodes = [];              // list of active nodes
        this.handlers = {
            'localPosition': function (node) {
                const object = node.localPosition;
                const func = function (value) {
                    object.set(...value);
                };
                return DefaultAnimBinder.createAnimTarget(func, 'vector', 3, node, 'localPosition');
            },

            'localRotation': function (node) {
                const object = node.localRotation;
                const func = function (value) {
                    object.set(...value);
                };
                return DefaultAnimBinder.createAnimTarget(func, 'quaternion', 4, node, 'localRotation');
            },

            'localScale': function (node) {
                const object = node.localScale;
                const func = function (value) {
                    object.set(...value);
                };
                return DefaultAnimBinder.createAnimTarget(func, 'vector', 3, node, 'localScale');
            },

            'weights': function (node) {
                const meshInstances = findMeshInstances(node);
                if (meshInstances) {
                    const morphInstances = [];
                    for (let i = 0; i < meshInstances.length; ++i) {
                        if (meshInstances[i].node.name === node.name && meshInstances[i].morphInstance) {
                            morphInstances.push(meshInstances[i].morphInstance);
                        }
                    }
                    if (morphInstances.length > 0) {
                        const func = function (value) {
                            for (let i = 0; i < value.length; ++i) {
                                for (let j = 0; j < morphInstances.length; j++) {
                                    morphInstances[j].setWeight(i, value[i]);
                                }
                            }
                        };
                        return DefaultAnimBinder.createAnimTarget(func, 'vector', morphInstances[0].morph._targets.length, node, 'weights');
                    }
                }

                return null;
            },
            'materialTexture': function (node, textureName) {
                const meshInstances = findMeshInstances(node);
                if (meshInstances) {
                    let meshInstance;
                    for (let i = 0; i < meshInstances.length; ++i) {
                        if (meshInstances[i].node.name === node.name) {
                            meshInstance = meshInstances[i];
                            break;
                        }
                    }
                    if (meshInstance) {
                        const func = function (value) {
                            const textureAsset = this.animComponent.system.app.assets.get(value[0]);
                            if (textureAsset && textureAsset.resource && textureAsset.type === 'texture') {
                                meshInstance.material[textureName] = textureAsset.resource;
                                meshInstance.material.update();
                            }
                        }.bind(this);
                        return DefaultAnimBinder.createAnimTarget(func, 'vector', 1, node, 'materialTexture', 'material');
                    }
                }

                return null;
            }.bind(this)
        };
    }

    _isPathActive(path) {
        if (!this._mask) return true;

        let shouldAnimateNode = false;

        const entityPathArrays = [path.entityPath];
        if (this.graph.name !== entityPathArrays[0][0]) {
            entityPathArrays.push([this.graph.name, ...entityPathArrays[0].slice(1)]);
        }

        for (let i = 0; i < entityPathArrays.length; i++) {
            const entityPathArr = entityPathArrays[i];
            const entityPath = entityPathArr.join('/');
            let maskItem = this._mask[entityPath];
            if (this._mask[entityPath] && this._mask[entityPath]?.value !== false) {
                shouldAnimateNode = true;
            } else {
                for (let i = 0; i < entityPathArr.length; i++) {
                    maskItem = this._mask[entityPathArr.slice(0, i + 1).join('/')];
                    if (maskItem?.children) {
                        shouldAnimateNode = true;
                        break;
                    }
                }
            }
        }
        return shouldAnimateNode;
    }

    findNode(path) {
        if (!this._isPathActive(path)) {
            return null;
        }

        let node;
        if (this.graph) {
            node = this.graph.findByPath(path.entityPath);
        }
        if (!node) {
            node = this.nodes[path.entityPath[path.entityPath.length - 1] || ""];

            // #if _DEBUG
            const fallbackGraphPath = AnimBinder.encode(path.entityPath[path.entityPath.length - 1] || "", 'graph', path.propertyPath);
            if (this.visitedFallbackGraphPaths[fallbackGraphPath] === 1) {
                console.warn('Anim Binder: Multiple animation curves with the path ' + fallbackGraphPath + ' are present in the ' + this.graph.path + ' graph which may result in the incorrect binding of animations');
            }
            if (!Number.isFinite(this.visitedFallbackGraphPaths[fallbackGraphPath])) {
                this.visitedFallbackGraphPaths[fallbackGraphPath] = 0;
            } else {
                this.visitedFallbackGraphPaths[fallbackGraphPath]++;
            }
            // #endif
        }
        return node;
    }

    static createAnimTarget(func, type, valueCount, node, propertyPath, componentType) {
        const targetPath = AnimBinder.encode(node.path, componentType ? componentType : 'entity', propertyPath);
        return new AnimTarget(func, type, valueCount, targetPath);
    }

    resolve(path) {
        const encodedPath = AnimBinder.encode(path.entityPath, path.component, path.propertyPath);
        let target = this.targetCache[encodedPath];
        if (target) return target;

        const node = this.findNode(path);
        if (!node) {
            return null;
        }

        const handler = this.handlers[path.propertyPath];
        if (!handler) {
            return null;
        }

        target = handler(node);
        if (!target) {
            return null;
        }

        this.targetCache[encodedPath] = target;

        if (!this.nodeCounts[node.path]) {
            this.activeNodes.push(node);
            this.nodeCounts[node.path] = 1;
        } else {
            this.nodeCounts[node.path]++;
        }

        return target;
    }

    unresolve(path) {
        if (path.component !== 'graph')
            return;

        const node = this.nodes[path.entityPath[path.entityPath.length - 1] || ""];

        this.nodeCounts[node.path]--;
        if (this.nodeCounts[node.path] === 0) {
            const activeNodes = this.activeNodes;
            const i = activeNodes.indexOf(node.node);  // :(
            const len = activeNodes.length;
            if (i < len - 1) {
                activeNodes[i] = activeNodes[len - 1];
            }
            activeNodes.pop();
        }
    }

    // flag animating nodes as dirty
    update(deltaTime) {
        const activeNodes = this.activeNodes;
        for (let i = 0; i < activeNodes.length; ++i) {
            activeNodes[i]._dirtifyLocal();
        }
    }

    assignMask(mask) {
        this._mask = mask;
    }
}

export { DefaultAnimBinder };
