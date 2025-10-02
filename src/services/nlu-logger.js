import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Log NLU pour analyse et amélioration
 */
export async function logNLUResult({
  userId,
  userMessage,
  detectedIntent,
  detectedEntities,
  confidence,
  wasSuccessful = true,
  processingTime = null
}) {
  try {
    const { error } = await supabase
      .from('nlu_logs')
      .insert([{
        user_id: userId,
        input_text: userMessage,
        detected_intent: detectedIntent,
        detected_entities: detectedEntities,
        confidence,
        was_successful: wasSuccessful,
        processing_time_ms: processingTime
      }]);
    
    if (error) {
      console.error('[NLU-LOG] Failed to save:', error);
    }
  } catch (error) {
    console.error('[NLU-LOG] Error:', error);
  }
}

/**
 * Update feedback utilisateur
 */
export async function updateNLUFeedback(userId, userMessage, feedback, actualIntent = null) {
  try {
    // Trouve le dernier log de cet user avec ce message
    const { data: logs } = await supabase
      .from('nlu_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('input_text', userMessage)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (logs && logs[0]) {
      const { error } = await supabase
        .from('nlu_logs')
        .update({
          user_feedback: feedback,
          actual_intent: actualIntent,
          updated_at: new Date().toISOString()
        })
        .eq('id', logs[0].id);
      
      if (error) {
        console.error('[NLU-LOG] Failed to update feedback:', error);
      }
    }
  } catch (error) {
    console.error('[NLU-LOG] Error:', error);
  }
}