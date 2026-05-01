import os
import aiofiles
from openai import AsyncOpenAI
from pathlib import Path

# Initialize OpenAI Client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def generate_system_prompt(product_name: str, company_name: str, questions: list[str], slots: list[str]) -> str:
    # Read the base template
    template_path = Path(__file__).parent.parent.parent / "prompts" / "template.md"
    
    async with aiofiles.open(template_path, mode='r', encoding='utf-8') as f:
        template_content = await f.read()

    # Replace static placeholders
    questions_list = "\n".join([f"- {q}" for q in questions])
    slots_str = ", ".join(slots)
    
    hydrated_template = template_content \
        .replace("{{company_name}}", company_name) \
        .replace("{{product_name}}", product_name) \
        .replace("{{qualification_questions}}", questions_list) \
        .replace("{{slots}}", slots_str)

    # Ask OpenAI to generate the data collection flow based on questions
    system_message = f"""You are a conversation designer. Take these qualification questions and turn them into a polite conversational flow for an AI voice agent, keeping pauses in mind.
Questions:
{questions_list}

Format as a bulleted list of scripts. Each bullet should end with *Pause*."""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": "Generate the data_collection_flow."}
        ]
    )

    generated_flow = response.choices[0].message.content

    # Insert generated flow into template
    final_prompt = hydrated_template.replace("{{data_collection_flow}}", generated_flow)

    # Save to file
    file_name = product_name.lower().replace(" ", "_") + ".md"
    save_path = Path(__file__).parent.parent.parent / "prompts" / file_name
    
    async with aiofiles.open(save_path, mode='w', encoding='utf-8') as f:
        await f.write(final_prompt)

    return str(save_path)
