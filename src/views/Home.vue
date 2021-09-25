<template>
  <div class="home p-2">
    <HardcodedText ref="textDiv"
                   :id="textId"
                   @pointerup="() => showHighlight()" />
    <HighlightSelectPopup v-if="temporaryHighlights" :scrollTop="0" />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import HardcodedText from '@/components/HardcodedText.vue';
import HighlightSelectPopup from '@/components/HighlightSelectPopup.vue';
import useTextHighlighter from '@/composables/text-highlighter';

export default {
  name: 'Home',
  components: {
    HardcodedText,
    HighlightSelectPopup,
  },
  setup () {
    const textDiv = ref(null)
    const { loadHighlights, showHighlightPopup, temporaryHighlights, textId } = useTextHighlighter()

    onMounted(async () => {
      loadHighlights()
    })
    const showHighlight = function() {
      showHighlightPopup()
    }
    return {
      textDiv,
      textId,
      temporaryHighlights,
      showHighlight,
    }
  }
}
</script>
