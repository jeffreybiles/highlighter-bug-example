import { ref, computed, nextTick } from 'vue';
import { doHighlight, deserializeHighlights, serializeHighlights, removeHighlights } from "@funktechno/texthighlighter/lib/index";
import { normalizeHighlights } from "@funktechno/texthighlighter/lib/Library";
import { refineRangeBoundaries, NODE_TYPE, IGNORE_TAGS, DATA_ATTR } from "@funktechno/texthighlighter/lib/Utils";
import { dom } from "@/utils/dom";
import { useLocalStorage } from 'vue-composable';
import { deconstructHighlights, wrapRange, wrapMultipleElements } from '../utils/my-text-highlighter-functions';

const colors = ['#E0C3C4', '#ABE4B8', '#E1DCAD', '#E2CBA9', '#3F3F45']
const temporaryHighlights = ref(null)
const temporaryHighlightsRange = ref(null)

const highlightKey = 'highlights'
const textId = "highlightableText";

export const useTextHighlighter = function() {
  const getHighlights = function() {
    return JSON.parse(localStorage.getItem(highlightKey))
  }
  const saveHighlights = function(data) {
    const highlightedData = serializeHighlights(data)
    localStorage.setItem(highlightKey, highlightedData)
  }
  const loadHighlights = function() {
    var text = document.getElementById(textId);
    removeHighlights(text);
    const highlights = getHighlights()
    if(text && highlights) deserializeHighlights(text, JSON.stringify(highlights))
  }

  const highlightText = function(highlightId, color) {
    document.getSelection().removeAllRanges();

    const range = temporaryHighlights.value;
    if(range.startContainer.parentElement == range.endContainer) {
      wrapRange(range, color)
    } else {
      const children = range.commonAncestorContainer.childNodes;
      wrapMultipleElements(children, range, color)
    }

    const text = document.getElementById(textId)
    saveHighlights(text)
    return text;
  }
  const runHighlight = async function(color){
    highlightText(textId, color)
  }

  const showHighlightPopup = function(){
    let wrapper, createdHighlights, normalizedHighlights, timestamp;
    if(document.getSelection().type !== 'Range') {
      return;
    }

    var text = document.getElementById(textId);

    const range = document.getSelection().getRangeAt(0)

    deconstructHighlights(range)

    temporaryHighlightsRange.value = range;
    temporaryHighlights.value = range;

    document.getSelection().removeAllRanges();    
  }

  const hideHighlightPopup = function(){
    temporaryHighlights.value = null;
  }

  return {
    runHighlight,
    loadHighlights,
    colors,
    showHighlightPopup,
    hideHighlightPopup,
    temporaryHighlights,
    highlightText,
    textId
  };
}

export default useTextHighlighter;