const autoStart = require('./index');
const scope     = require('../scope');
const browser   = require('../utils/browser');

const { isElement } = require('../utils/isType');
const { matchesSelector, parentElement } = require('../utils/domUtils');

autoStart.signals.on('before-start-drag',  function ({ interaction, eventTarget, dx, dy }) {
  // check if a drag is in the correct axis
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const dragOptions = interaction.target.options.drag;
  const startAxis = dragOptions.startAxis;
  const currentAxis = (absX > absY ? 'x' : absX < absY ? 'y' : 'xy');

  interaction.prepared.axis = dragOptions.lockAxis === 'start'
    ? currentAxis
    : dragOptions.lockAxis;

  // if the movement isn't in the startAxis of the interactable
  if (currentAxis !== 'xy' && startAxis !== 'xy' && startAxis !== currentAxis) {
    // cancel the prepared action
    interaction.prepared.name = null;

    // then try to get a drag from another ineractable

    if (!interaction.prepared.name) {

      let element = eventTarget;

      const getDraggable = function (interactable, selector, context) {
        const elements = browser.useMatchesSelectorPolyfill
            ? context.querySelectorAll(selector)
            : undefined;

        if (interactable === interaction.target) { return; }

        let action = null;

        if (scope.inContext(interactable, eventTarget)
            && !interactable.options.drag.manualStart
            && !scope.testIgnore(interactable, element, eventTarget)
            && scope.testAllow(interactable, element, eventTarget)
            && matchesSelector(element, selector, elements)) {

          action = interactable.getAction(interaction.downPointer, interaction.downEvent, interaction, element);
        }
        if (action
            && action.name === 'drag'
            && checkStartAxis(currentAxis, interactable)
            && scope.withinInteractionLimit(interactable, element, { name: 'drag' })) {

          return interactable;
        }
      };

      let action = null;

      // check all interactables
      while (isElement(element)) {
        const elementInteractable = scope.interactables.get(element);

        if (elementInteractable
            && elementInteractable !== interaction.target
            && !elementInteractable.options.drag.manualStart) {

          action = elementInteractable.getAction(interaction.downPointer, interaction.downEvent, interaction, element);
        }
        if (action
            && action.name === 'drag'
            && checkStartAxis(currentAxis, elementInteractable)) {

          interaction.prepared.name = 'drag';
          interaction.target = elementInteractable;
          interaction.element = element;
          break;
        }

        const selectorInteractable = scope.interactables.forEachSelector(getDraggable);

        if (selectorInteractable) {
          interaction.prepared.name = 'drag';
          interaction.target = selectorInteractable;
          interaction.element = element;
          break;
        }

        element = parentElement(element);
      }
    }
  }
});

function checkStartAxis (startAxis, interactable) {
  if (!interactable) { return false; }

  const thisAxis = interactable.options.drag.startAxis;

  return (startAxis === 'xy' || thisAxis === 'xy' || thisAxis === startAxis);
}

