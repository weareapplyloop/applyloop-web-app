import { ApiError } from '../../../lib/auth/requireAdmin';
import { requireClient } from '../../../lib/auth/requireClient';

const FORM_FIELDS = `
  id,
  user_id,
  answers,
  current_question,
  status,
  started_at,
  last_saved_at,
  submitted_at,
  created_at,
  updated_at
`;

function validateAnswers(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new ApiError(
      400,
      'Onboarding answers must be valid form data.'
    );
  }

  return value;
}

function validateQuestion(value) {
  if (value === undefined) {
    return undefined;
  }

  const question = Number(value);

  if (
    !Number.isInteger(question) ||
    question < 1 ||
    question > 15
  ) {
    throw new ApiError(
      400,
      'The current question must be between 1 and 15.'
    );
  }

  return question;
}

function formatForm(form) {
  return {
    id: form.id,
    answers: form.answers || {},
    currentQuestion: form.current_question,
    status: form.status,
    startedAt: form.started_at,
    lastSavedAt: form.last_saved_at,
    submittedAt: form.submitted_at,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
  };
}

async function ensureClientRecord(
  supabase,
  profileId
) {
  const {
    data: client,
    error,
  } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', profileId)
    .maybeSingle();

  if (error) {
    console.error(
      'Unable to verify client record:',
      error
    );

    throw new ApiError(
      500,
      'Your client record could not be verified.'
    );
  }

  if (!client) {
    throw new ApiError(
      404,
      'Your client record could not be found.'
    );
  }

  return client;
}

async function getOrCreateForm(
  supabase,
  profileId
) {
  const {
    data: existingForm,
    error: readError,
  } = await supabase
    .from('client_onboarding_forms')
    .select(FORM_FIELDS)
    .eq('user_id', profileId)
    .maybeSingle();

  if (readError) {
    console.error(
      'Unable to load onboarding form:',
      readError
    );

    throw new ApiError(
      500,
      'Your onboarding form could not be loaded.'
    );
  }

  if (existingForm) {
    return existingForm;
  }

  const {
    data: createdForm,
    error: createError,
  } = await supabase
    .from('client_onboarding_forms')
    .insert({
      user_id: profileId,
    })
    .select(FORM_FIELDS)
    .single();

  if (createError || !createdForm) {
    if (createError?.code === '23505') {
      const {
        data: form,
        error: retryError,
      } = await supabase
        .from('client_onboarding_forms')
        .select(FORM_FIELDS)
        .eq('user_id', profileId)
        .single();

      if (!retryError && form) {
        return form;
      }
    }

    console.error(
      'Unable to create onboarding form:',
      createError
    );

    throw new ApiError(
      500,
      'Your onboarding form could not be created.'
    );
  }

  return createdForm;
}

export default async function handler(req, res) {
  if (
    !['GET', 'PATCH', 'POST'].includes(
      req.method
    )
  ) {
    res.setHeader(
      'Allow',
      'GET, PATCH, POST'
    );

    return res.status(405).json({
      error: 'Method not allowed.',
    });
  }

  try {
    const {
      profile,
      supabase,
    } = await requireClient(req);

    await ensureClientRecord(
      supabase,
      profile.id
    );

    const form = await getOrCreateForm(
      supabase,
      profile.id
    );

    if (req.method === 'GET') {
      return res.status(200).json({
        onboarding: formatForm(form),
      });
    }

    const answers = validateAnswers(
      req.body?.answers
    );

    if (req.method === 'PATCH') {
      const currentQuestion =
        validateQuestion(
          req.body?.currentQuestion
        );

      if (
        answers === undefined &&
        currentQuestion === undefined
      ) {
        throw new ApiError(
          400,
          'There is no onboarding progress to save.'
        );
      }

      if (form.status === 'submitted') {
        throw new ApiError(
          409,
          'Your onboarding form has already been submitted.'
        );
      }

      const now = new Date().toISOString();

      const changes = {
        status: 'in_progress',
        started_at:
          form.started_at || now,
        last_saved_at: now,
      };

      if (answers !== undefined) {
        changes.answers = {
          ...(form.answers || {}),
          ...answers,
        };
      }

      if (currentQuestion !== undefined) {
        changes.current_question =
          currentQuestion;
      }

      const {
        data: updatedForm,
        error: updateError,
      } = await supabase
        .from('client_onboarding_forms')
        .update(changes)
        .eq('id', form.id)
        .select(FORM_FIELDS)
        .single();

      if (updateError || !updatedForm) {
        console.error(
          'Unable to save onboarding progress:',
          updateError
        );

        throw new ApiError(
          500,
          'Your onboarding progress could not be saved.'
        );
      }

      return res.status(200).json({
        message:
          'Onboarding progress saved.',
        onboarding:
          formatForm(updatedForm),
      });
    }

    if (form.status === 'submitted') {
      return res.status(200).json({
        message:
          'Your onboarding form has already been submitted.',
        onboarding: formatForm(form),
      });
    }

    const now = new Date().toISOString();

    const finalAnswers =
      answers === undefined
        ? form.answers || {}
        : {
            ...(form.answers || {}),
            ...answers,
          };

    const {
      data: submittedForm,
      error: submitError,
    } = await supabase
      .from('client_onboarding_forms')
      .update({
        answers: finalAnswers,
        current_question: 15,
        status: 'submitted',
        started_at:
          form.started_at || now,
        last_saved_at: now,
        submitted_at: now,
      })
      .eq('id', form.id)
      .select(FORM_FIELDS)
      .single();

    if (submitError || !submittedForm) {
      console.error(
        'Unable to submit onboarding form:',
        submitError
      );

      throw new ApiError(
        500,
        'Your onboarding form could not be submitted.'
      );
    }

    return res.status(200).json({
      message:
        'Onboarding submitted successfully.',
      onboarding:
        formatForm(submittedForm),
    });
  } catch (error) {
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      console.error(
        'Client onboarding API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to process your onboarding right now.'
          : error.message,
    });
  }
}
