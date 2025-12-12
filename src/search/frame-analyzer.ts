import { RawImage, type PreTrainedModel, type Processor, type PreTrainedTokenizer } from "@huggingface/transformers";

// const CAPTION_TASK = "<CAPTION>";
const CAPTION_TASK = "<DETAILED_CAPTION>";
const MAX_NEW_TOKENS = 100;

export class FrameAnalyzer {
  #model: PreTrainedModel;
  #processor: Processor;
  #tokenizer: PreTrainedTokenizer;

  constructor(
    model: PreTrainedModel,
    processor: Processor,
    tokenizer: PreTrainedTokenizer
  ) {
    this.#model = model;
    this.#processor = processor;
    this.#tokenizer = tokenizer;
  }

  async generateCaption(imageDataUrl: string): Promise<string> {
    const image = await RawImage.fromURL(imageDataUrl);
    // @ts-ignore - processor methods are dynamically typed
    const visionInputs = await this.#processor(image);
    // @ts-ignore - processor methods are dynamically typed
    const prompts = this.#processor.construct_prompts(CAPTION_TASK);
    const textInputs = this.#tokenizer(prompts);

    // @ts-ignore - model.generate has dynamic signature
    const generatedIds = await this.#model.generate({
      ...textInputs,
      ...visionInputs,
      max_new_tokens: MAX_NEW_TOKENS,
    });

    // @ts-ignore
    const generatedText = this.#tokenizer.batch_decode(generatedIds, {
      skip_special_tokens: false,
    })[0];

    // @ts-ignore - processor methods are dynamically typed
    const result = this.#processor.post_process_generation(
      generatedText,
      CAPTION_TASK,
      image.size
    );

    return result[CAPTION_TASK] as string;
  }
}
