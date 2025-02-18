title: DeepSeek-R1: Advancing Reasoning Capabilities Through Pure Reinforcement Learning
date: 2024-03-20 08:59:32
tags: [AI, Machine Learning, Deep Learning, Reinforcement Learning]
---

# DeepSeek-R1: Advancing Reasoning Capabilities Through Pure Reinforcement Learning

DeepSeek recently released their DeepSeek-R1 model, achieving reasoning capabilities on par with OpenAI's o1 models through pure reinforcement learning. Let's explore how they did it and what Hugging Face is doing with Open-R1.

## What is DeepSeek-R1?

If you've ever struggled with a tough math problem, you know how useful it is to think longer and work through it carefully. OpenAI's o1 model showed that when LLMs are trained to do the same—by using more compute during inference—they get significantly better at solving reasoning tasks like mathematics, coding, and logic.

However, the recipe behind OpenAI's reasoning models has been a well kept secret. That is, until last week, when DeepSeek released their DeepSeek-R1 model and promptly broke the internet (and the stock market!).

Besides performing as well or better than o1, the DeepSeek-R1 release was accompanied by a detailed tech report outlining their training recipe. This recipe involved several innovations, most notably the application of pure reinforcement learning to teach a base language model how to reason without any human supervision.

## The Training Process

DeepSeek-R1 is built on the foundation of DeepSeek-V3, a 671B parameter Mixture of Experts (MoE) model that performs on par with models like Sonnet 3.5 and GPT-4o. What's especially impressive is how cost-efficient it was to train—just $5.5M—thanks to architectural optimizations.

The training process involved two key models:

1. **DeepSeek-R1-Zero**: This model skipped supervised fine-tuning entirely and relied on pure reinforcement learning using Group Relative Policy Optimization (GRPO). A simple reward system guided the model based on answer accuracy and structure. While it developed strong reasoning skills, its outputs often lacked clarity.

2. **DeepSeek-R1**: This model started with a "cold start" phase using carefully crafted examples to improve clarity. It then went through multiple rounds of RL and refinement, including rejecting low-quality outputs using both human preference and verifiable rewards.

## The Open-R1 Project

While DeepSeek released their model weights, the datasets and training code remain closed. This prompted Hugging Face to launch the Open-R1 project, which aims to:

1. Replicate R1-Distill models by distilling reasoning datasets from DeepSeek-R1
2. Recreate the pure RL pipeline used for R1-Zero
3. Demonstrate the complete training pipeline from base model → SFT → RL

The project will focus on:
- Creating synthetic datasets for fine-tuning LLMs into reasoning models
- Developing training recipes for building similar models from scratch
- Exploring applications beyond math into areas like code and medicine

## Key Innovations and Results

Some notable achievements of DeepSeek-R1 include:

- 79.8% Pass@1 on AIME 2024, surpassing OpenAI-o1-1217
- 97.3% score on MATH-500
- 2,029 Elo rating on Codeforces (outperforming 96.3% of human participants)
- Strong performance on knowledge benchmarks like MMLU (90.8%) and MMLU-Pro (84.0%)

## Looking Forward

The release of DeepSeek-R1 represents a significant step forward in open-source AI development. By demonstrating that pure reinforcement learning can create powerful reasoning models, it opens new possibilities for advancing AI capabilities without relying on extensive human supervision.

The Open-R1 project aims to make these advances even more accessible to the research community, potentially accelerating progress in areas like mathematical reasoning, coding, and scientific problem-solving.

Try Deepseek on [Netwrck](https://netwrck.com/)