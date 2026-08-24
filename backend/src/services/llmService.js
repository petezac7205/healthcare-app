import { config } from '../config/env.js';

export const generatePreVisitSummary = async (symptoms) => {
  const prompt = `Analyse these symptoms and return a JSON object with exactly these fields: urgency (one of: Low, Medium, High), chief_complaint (string), questions (array of exactly 3 strings - suggested questions for the doctor). Symptoms: ${symptoms}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let content = null;

    if (config.llm.provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.llm.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    } else if (config.llm.provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.llm.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const data = await response.json();
      content = data.content?.[0]?.text;
    } else {
      // Default: OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.llm.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      content = data.choices?.[0]?.message?.content;
    }

    if (!content) {
      throw new Error('No content returned from LLM');
    }

    const parsed = JSON.parse(content);

    if (!parsed.urgency || !parsed.chief_complaint || !Array.isArray(parsed.questions) || parsed.questions.length !== 3) {
      throw new Error('Invalid JSON structure returned from LLM');
    }

    return {
      urgency: parsed.urgency,
      chief_complaint: parsed.chief_complaint,
      questions: parsed.questions,
      ok: true
    };
  } catch (error) {
    console.error('LLM Pre-visit Error:', error.message);
    return {
      urgency: 'Unrated',
      chief_complaint: null,
      questions: null,
      ok: false
    };
  }
};

export const generatePostVisitSummary = async (doctorNotes, prescription) => {
  const prompt = `Convert these clinical notes into a patient-friendly summary. Include: 1) A clear summary of what was discussed/found during the visit, 2) A medication schedule table showing each drug, dosage, frequency, and duration, 3) Follow-up steps the patient should take. Clinical notes: ${doctorNotes}. Prescription: ${JSON.stringify(prescription)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let content = null;

    if (config.llm.provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.llm.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    } else if (config.llm.provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.llm.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const data = await response.json();
      content = data.content?.[0]?.text;
    } else {
      // Default: OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.llm.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      content = data.choices?.[0]?.message?.content;
    }

    if (!content) {
      throw new Error('No content returned from LLM');
    }

    return {
      summary: content,
      ok: true
    };
  } catch (error) {
    console.error('LLM Post-visit Error:', error.message);
    return {
      summary: null,
      ok: false
    };
  }
};
