import OpenAI from "openai";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const SYSTEM_PROMPT = `You are an AI assistant for an ad generation platform specializing in recruitment and HR services advertising. You help users create, research, and optimize ads.

You can:
1. Research competitor ads from Meta Ad Library and the web
2. Analyze collected ads to identify patterns and best practices
3. Generate ad copy (headlines, body text, CTAs) in multiple variants
4. Generate background images using DALL-E 3 (pass copy_file to inform visuals)
5. Compose final flyers by overlaying copy onto DALL-E backgrounds (creates production-ready PNGs)
6. Score finished ads and suggest improvements
7. Run the full pipeline end-to-end (research → analyze → copy → images → compose → done)

IMPORTANT: When generating ads, always complete the full visual pipeline:
- After generate_copy, use generate_flyer_image with the copy_file path
- After generate_flyer_image, use compose_flyer with the manifest and copy_file paths
- The final composed flyers in .tmp/output/final/ are the production-ready images

Available service lines: recruitment, performance_management, learning_development
Available ad types: flyer, social_ad, story_ad, linkedin_ad

When a user asks you to create an ad, research competitors, or generate content, use the appropriate tools. Explain what you're doing at each step. If the user asks a general question, answer directly without invoking tools.`;

export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "research_meta_ads",
      description:
        "Scrape recruitment ads from the Meta Ad Library to research competitor ads and best practices.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: [
              "recruitment",
              "performance_management",
              "learning_development",
            ],
            description: "The service line to research",
          },
        },
        required: ["service"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "research_web_ads",
      description:
        "Search the web for recruitment ad and flyer examples using Google Custom Search.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: [
              "recruitment",
              "performance_management",
              "learning_development",
            ],
            description: "The service line to research",
          },
          download_images: {
            type: "boolean",
            description: "Whether to download reference images locally",
          },
        },
        required: ["service"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_ads",
      description:
        "Analyze previously collected ads using GPT-4 to identify copy patterns, visual patterns, and best practices. Requires research data to have been collected first.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: [
              "recruitment",
              "performance_management",
              "learning_development",
            ],
            description: "The service line to analyze",
          },
        },
        required: ["service"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_copy",
      description:
        "Generate ad copy variants using GPT-4. Produces headline/body/CTA options.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: [
              "recruitment",
              "performance_management",
              "learning_development",
            ],
            description: "The service line",
          },
          ad_type: {
            type: "string",
            enum: ["flyer", "social_ad", "story_ad", "linkedin_ad"],
            description: "The type of ad",
          },
          brief: {
            type: "string",
            description: "Additional creative direction",
          },
          variants: {
            type: "number",
            description: "Number of copy variants to generate (default 3)",
          },
        },
        required: ["service", "ad_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_flyer_image",
      description: "Generate background images for ads using DALL-E 3. Pass copy_file from generate_copy output to inform the visuals.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: [
              "recruitment",
              "performance_management",
              "learning_development",
            ],
            description: "The service line",
          },
          copy_file: {
            type: "string",
            description: "Path to the copy JSON file from generate_copy (e.g. .tmp/output/copy_recruitment_flyer_TIMESTAMP.json)",
          },
          sizes: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "instagram_square",
                "instagram_story",
                "facebook_feed",
                "facebook_story",
                "linkedin_feed",
                "linkedin_story",
                "general_flyer",
              ],
            },
            description: "Ad sizes to generate",
          },
        },
        required: ["service"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compose_flyer",
      description:
        "Compose final flyer images by overlaying generated copy onto DALL-E background images. Requires both a DALL-E manifest (from generate_flyer_image) and a copy JSON file (from generate_copy).",
      parameters: {
        type: "object",
        properties: {
          manifest: {
            type: "string",
            description:
              "Path to the DALL-E manifest JSON from generate_flyer_image",
          },
          copy_file: {
            type: "string",
            description:
              "Path to the copy JSON file from generate_copy",
          },
          variant: {
            type: "number",
            description:
              "Specific copy variant number to use (0 = all variants, default)",
          },
        },
        required: ["manifest", "copy_file"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "score_ad",
      description:
        "Score a generated ad on visual appeal, copy clarity, CTA strength, brand alignment, audience fit, and effectiveness. Returns scores out of 10.",
      parameters: {
        type: "object",
        properties: {
          image_path: {
            type: "string",
            description: "Path to the ad image to score",
          },
        },
        required: ["image_path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_full_pipeline",
      description:
        "Run the complete ad generation pipeline end-to-end: research → analyze → generate copy → generate image → compose flyer → score. Use this when the user wants to generate an ad from scratch.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: [
              "recruitment",
              "performance_management",
              "learning_development",
            ],
            description: "The service line",
          },
          ad_type: {
            type: "string",
            enum: ["flyer", "social_ad", "story_ad", "linkedin_ad"],
            description: "The type of ad",
          },
        },
        required: ["service", "ad_type"],
      },
    },
  },
];
