import { ApiError } from '../../../lib/auth/requireAdmin';
import { requireClient } from '../../../lib/auth/requireClient';

function optionalText(value, field, maxLength = 500) {
  if (value === undefined) return undefined;

  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} must be text.`);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ApiError(400, `${field} is too long.`);
  }

  return trimmed || '';
}

function optionalStringArray(value, field) {
  if (value === undefined) return undefined;

  if (!Array.isArray(value)) {
    throw new ApiError(400, `${field} must be a list.`);
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 50);
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (!value) return [];

  return String(value)
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getExperienceLevel(value) {
  const experience = String(value || '').toLowerCase();

  if (
    experience.includes('more than 10') ||
    experience.includes('8-10')
  ) {
    return 'Lead Level';
  }

  if (experience.includes('5-7')) {
    return 'Senior Level';
  }

  if (experience.includes('3-4')) {
    return 'Intermediate Level';
  }

  return 'Junior Level';
}

function createJobSpread(count) {
  if (!count) return [];

  const base =
    Math.floor(100 / count / 5) * 5;

  let remainder = 100 - base * count;

  return Array.from(
    { length: count },
    (_, index) => {
      let value = base;

      if (remainder >= 5) {
        value += 5;
        remainder -= 5;
      }

      if (
        index === count - 1 &&
        remainder > 0
      ) {
        value += remainder;
      }

      return `${value}%`;
    }
  );
}

function createJobs(answers) {
  if (
    Array.isArray(answers.settingsJobs) &&
    answers.settingsJobs.length
  ) {
    return answers.settingsJobs;
  }

  const roles = parseList(
    answers.targetRoles
  );

  const spreads =
    createJobSpread(roles.length);

  const level = getExperienceLevel(
    answers.yearsExperience
  );

  return roles.map((title, index) => ({
    title,
    level,
    spread: spreads[index] || '10%',
  }));
}

async function getSettings(
  supabase,
  profile
) {
  const [
    clientResult,
    profileResult,
    onboardingResult,
  ] = await Promise.all([
    supabase
      .from('clients')
      .select(
        'gender, portfolio_url, linkedin_url, address, state_province, disability, veteran'
      )
      .eq('user_id', profile.id)
      .single(),

    supabase
      .from('profiles')
      .select(
        'id, email, full_name, phone, country, timezone'
      )
      .eq('id', profile.id)
      .single(),

    supabase
      .from('client_onboarding_forms')
      .select(
        'answers, status, submitted_at'
      )
      .eq('user_id', profile.id)
      .maybeSingle(),
  ]);

  const {
    data: client,
    error: clientError,
  } = clientResult;

  const {
    data: currentProfile,
    error: profileError,
  } = profileResult;

  const {
    data: onboarding,
    error: onboardingError,
  } = onboardingResult;

  if (clientError || !client) {
    throw new ApiError(
      404,
      'Your client record could not be found.'
    );
  }

  if (
    profileError ||
    !currentProfile
  ) {
    throw new ApiError(
      404,
      'Your profile could not be found.'
    );
  }

  if (onboardingError) {
    throw new ApiError(
      500,
      'Your preferences could not be loaded.'
    );
  }

  const answers =
    onboarding?.answers || {};

  return {
    fullName:
      currentProfile.full_name || '',
    email:
      currentProfile.email || '',
    phone:
      currentProfile.phone || '',
    country:
      currentProfile.country || '',
    timezone:
      currentProfile.timezone || '',
    gender:
      client.gender || '',
    address:
      client.address || '',
    state:
      client.state_province || '',
    disability:
      client.disability || '',
    veteran:
      client.veteran || '',
    portfolioLink:
      client.portfolio_url || '',
    linkedinUrl:
      client.linkedin_url || '',

    workPreferences: {
      jobs: createJobs(answers),
      industry:
        answers.settingsIndustry ??
        answers.targetIndustries ??
        '',
      specialization:
        answers.settingsSpecialization ??
        '',
      workType:
        answers.settingsWorkType ??
        answers.workArrangement ??
        '',
      schedule:
        answers.settingsSchedule ??
        answers.employmentType ??
        '',
      duration:
        answers.settingsDuration ??
        '',
      locations:
        answers.settingsLocations ??
        parseList(
          answers.preferredLocations
        ),
    },

    workAuthorization: {
      requireSponsorship:
        answers.settingsRequireSponsorship ??
        answers.sponsorship ??
        '',
      authorizedToWork:
        answers.settingsAuthorizedToWork ??
        answers.workAuthorization ??
        '',
      excludedCompanies:
        answers.settingsExcludedCompanies ??
        [],
      priorityCompanies:
        answers.settingsPriorityCompanies ??
        [],
    },

    onboardingStatus:
      onboarding?.status || '',
    onboardingSubmittedAt:
      onboarding?.submitted_at || null,
  };
}

function validateJobs(value) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ApiError(
      400,
      'Job preferences must be a list.'
    );
  }

  return value
    .slice(0, 20)
    .map((job) => {
      if (
        !job ||
        typeof job !== 'object'
      ) {
        throw new ApiError(
          400,
          'Each job preference is invalid.'
        );
      }

      return {
        title:
          optionalText(
            job.title,
            'Job title',
            150
          ) || '',
        level:
          optionalText(
            job.level,
            'Expertise level',
            100
          ) || '',
        spread:
          optionalText(
            job.spread,
            'Application spread',
            20
          ) || '',
      };
    })
    .filter((job) => job.title);
}

export default async function handler(
  req,
  res
) {
  if (
    !['GET', 'PATCH'].includes(
      req.method
    )
  ) {
    res.setHeader(
      'Allow',
      'GET, PATCH'
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

    if (req.method === 'GET') {
      const settings =
        await getSettings(
          supabase,
          profile
        );

      return res
        .status(200)
        .json(settings);
    }

    const profileChanges = {};
    const clientChanges = {};
    const answerChanges = {};

    const fullName = optionalText(
      req.body?.fullName,
      'Full name',
      150
    );

    const phone = optionalText(
      req.body?.phone,
      'Phone number',
      50
    );

    const country = optionalText(
      req.body?.country,
      'Country',
      100
    );

    const timezone = optionalText(
      req.body?.timezone,
      'Time zone',
      100
    );

    const gender = optionalText(
      req.body?.gender,
      'Gender',
      50
    );

    const address = optionalText(
      req.body?.address,
      'Physical address',
      500
    );

    const state = optionalText(
      req.body?.state,
      'State or province',
      100
    );

    const disability = optionalText(
      req.body?.disability,
      'Disability',
      100
    );

    const veteran = optionalText(
      req.body?.veteran,
      'Veteran',
      100
    );

    const portfolioLink = optionalText(
      req.body?.portfolioLink,
      'Portfolio link',
      500
    );

    const linkedinUrl = optionalText(
      req.body?.linkedinUrl,
      'LinkedIn URL',
      500
    );

    if (fullName !== undefined) {
      profileChanges.full_name =
        fullName;
    }

    if (phone !== undefined) {
      profileChanges.phone = phone;
    }

    if (country !== undefined) {
      profileChanges.country =
        country;
    }

    if (timezone !== undefined) {
      profileChanges.timezone =
        timezone;
    }

    if (gender !== undefined) {
      clientChanges.gender = gender;
    }

    if (address !== undefined) {
      clientChanges.address =
        address;
    }

    if (state !== undefined) {
      clientChanges.state_province =
        state;
    }

    if (disability !== undefined) {
      clientChanges.disability =
        disability;
    }

    if (veteran !== undefined) {
      clientChanges.veteran =
        veteran;
    }

    if (
      portfolioLink !== undefined
    ) {
      clientChanges.portfolio_url =
        portfolioLink;
    }

    if (
      linkedinUrl !== undefined
    ) {
      clientChanges.linkedin_url =
        linkedinUrl;
    }

    const workPreferences =
      req.body?.workPreferences;

    if (
      workPreferences !== undefined
    ) {
      if (
        !workPreferences ||
        typeof workPreferences !==
          'object' ||
        Array.isArray(workPreferences)
      ) {
        throw new ApiError(
          400,
          'Work preferences are invalid.'
        );
      }

      const jobs = validateJobs(
        workPreferences.jobs
      );

      const industry = optionalText(
        workPreferences.industry,
        'Industry',
        500
      );

      const specialization =
        optionalText(
          workPreferences.specialization,
          'Specialization',
          200
        );

      const workType = optionalText(
        workPreferences.workType,
        'Work type',
        100
      );

      const schedule = optionalText(
        workPreferences.schedule,
        'Work schedule',
        100
      );

      const duration = optionalText(
        workPreferences.duration,
        'Contract duration',
        100
      );

      const locations =
        optionalStringArray(
          workPreferences.locations,
          'Location preferences'
        );

      if (jobs !== undefined) {
        answerChanges.settingsJobs =
          jobs;

        answerChanges.targetRoles =
          jobs
            .map((job) => job.title)
            .filter(Boolean)
            .join(', ');
      }

      if (industry !== undefined) {
        answerChanges.settingsIndustry =
          industry;

        answerChanges.targetIndustries =
          industry;
      }

      if (
        specialization !== undefined
      ) {
        answerChanges.settingsSpecialization =
          specialization;
      }

      if (workType !== undefined) {
        answerChanges.settingsWorkType =
          workType;

        answerChanges.workArrangement =
          workType;
      }

      if (schedule !== undefined) {
        answerChanges.settingsSchedule =
          schedule;

        answerChanges.employmentType =
          schedule;
      }

      if (duration !== undefined) {
        answerChanges.settingsDuration =
          duration;
      }

      if (locations !== undefined) {
        answerChanges.settingsLocations =
          locations;

        answerChanges.preferredLocations =
          locations.join(', ');
      }
    }

    const workAuthorization =
      req.body?.workAuthorization;

    if (
      workAuthorization !== undefined
    ) {
      if (
        !workAuthorization ||
        typeof workAuthorization !==
          'object' ||
        Array.isArray(workAuthorization)
      ) {
        throw new ApiError(
          400,
          'Work authorization settings are invalid.'
        );
      }

      const requireSponsorship =
        optionalText(
          workAuthorization.requireSponsorship,
          'Sponsorship',
          150
        );

      const authorizedToWork =
        optionalText(
          workAuthorization.authorizedToWork,
          'Work authorization',
          500
        );

      const excludedCompanies =
        optionalStringArray(
          workAuthorization.excludedCompanies,
          'Excluded companies'
        );

      const priorityCompanies =
        optionalStringArray(
          workAuthorization.priorityCompanies,
          'Priority companies'
        );

      if (
        requireSponsorship !== undefined
      ) {
        answerChanges.settingsRequireSponsorship =
          requireSponsorship;

        answerChanges.sponsorship =
          requireSponsorship;
      }

      if (
        authorizedToWork !== undefined
      ) {
        answerChanges.settingsAuthorizedToWork =
          authorizedToWork;

        answerChanges.workAuthorization =
          authorizedToWork;
      }

      if (
        excludedCompanies !== undefined
      ) {
        answerChanges.settingsExcludedCompanies =
          excludedCompanies;
      }

      if (
        priorityCompanies !== undefined
      ) {
        answerChanges.settingsPriorityCompanies =
          priorityCompanies;
      }
    }

    if (
      Object.keys(
        profileChanges
      ).length > 0
    ) {
      const { error } = await supabase
        .from('profiles')
        .update(profileChanges)
        .eq('id', profile.id);

      if (error) {
        throw new ApiError(
          500,
          'Your profile could not be updated.'
        );
      }
    }

    if (
      Object.keys(
        clientChanges
      ).length > 0
    ) {
      const { error } = await supabase
        .from('clients')
        .update(clientChanges)
        .eq('user_id', profile.id);

      if (error) {
        throw new ApiError(
          500,
          'Your client settings could not be updated.'
        );
      }
    }

    if (
      Object.keys(
        answerChanges
      ).length > 0
    ) {
      const {
        data: onboarding,
        error: onboardingError,
      } = await supabase
        .from(
          'client_onboarding_forms'
        )
        .select('id, answers')
        .eq('user_id', profile.id)
        .single();

      if (
        onboardingError ||
        !onboarding
      ) {
        throw new ApiError(
          404,
          'Your onboarding preferences could not be found.'
        );
      }

      const {
        error: updateAnswersError,
      } = await supabase
        .from(
          'client_onboarding_forms'
        )
        .update({
          answers: {
            ...(onboarding.answers ||
              {}),
            ...answerChanges,
          },
          last_saved_at:
            new Date().toISOString(),
        })
        .eq('id', onboarding.id);

      if (updateAnswersError) {
        throw new ApiError(
          500,
          'Your preferences could not be updated.'
        );
      }
    }

    const settings =
      await getSettings(
        supabase,
        profile
      );

    return res.status(200).json({
      message:
        'Settings updated successfully.',
      ...settings,
    });
  } catch (error) {
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      console.error(
        'Client settings API error:',
        error
      );
    }

    return res
      .status(statusCode)
      .json({
        error:
          statusCode >= 500
            ? 'Unable to update your settings right now.'
            : error.message,
      });
  }
}
