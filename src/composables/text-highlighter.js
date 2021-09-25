import { ref, computed, nextTick } from 'vue';
import { doHighlight, deserializeHighlights, serializeHighlights, removeHighlights, TextHighlighter } from "@funktechno/texthighlighter/lib/index";
import { useLocalStorage } from 'vue-composable';

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
    const text = document.getElementById(textId)
    doHighlight(text, false, { color, highlightedClass: 'my-highlights' })
    saveHighlights(text)
    return text;
  }
  const runHighlight = async function(color){
    // this is necessary because otherwise mobile on iOS selects _everything_
    document.getSelection().removeAllRanges();

    // this is necessary because Safari on desktop un-selects the range after the highlight select popup appears
    document.getSelection().addRange(temporaryHighlightsRange.value)

    highlightText(textId, color)

    await nextTick();

    // and this might be necessary because it wants to keep things highlighted for some reason...
    document.getSelection().removeAllRanges();
  }

  const showHighlightPopup = function(){
    if(document.getSelection().type !== 'Range') {
      return;
    }

    var text = document.getElementById(textId);
    doHighlight(text, true, {color: '#BBB', highlightedClass: 'my-highlights', onAfterHighlight: (range, highlight) => {
      temporaryHighlightsRange.value = range;
      temporaryHighlights.value = highlight;

      document.getSelection().removeAllRanges();
    }})
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