/**
 * Pure JavaScript Server-side Pricing Engine for Northline Roofing Estimator
 * Calculates exact estimates with waste factors, multipliers, tear-off, and permit fees.
 */

export function calculateEstimate(answers = {}, config = {}) {
  const errors = [];

  // Validate required active questions
  const questions = config.questions || [];
  const activeQuestions = questions.filter((q) => q.active);

  for (const q of activeQuestions) {
    const val = answers[q.key];
    if (q.required) {
      if (val === undefined || val === null || val === '') {
        errors.push(`Please provide an answer for "${q.label}".`);
        continue;
      }
    }

    if (val !== undefined && val !== null && val !== '') {
      if (q.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push(`"${q.label}" must be a valid number.`);
        } else {
          if (q.min !== undefined && num < q.min) {
            errors.push(`"${q.label}" must be at least ${q.min} ${q.unit || ''}`.trim() + '.');
          }
          if (q.max !== undefined && num > q.max) {
            errors.push(`"${q.label}" cannot exceed ${q.max} ${q.unit || ''}`.trim() + '.');
          }
        }
      } else if (q.type === 'select' && q.options && q.options.length > 0) {
        const matchingOption = q.options.find((opt) => String(opt.value) === String(val));
        if (!matchingOption) {
          errors.push(`Invalid selection for "${q.label}".`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // 1. Roof Area & Waste Factor
  const roofArea = Number(answers.roof_area) || 0;
  const wasteFactor =
    config.modifiers?.waste_factor !== undefined ? Number(config.modifiers.waste_factor) : 0.1;
  const effectiveArea = roofArea * (1 + wasteFactor);

  // 2. Material Cost (Look up material question or option with rate_per_sqft)
  let materialRate = 0;
  const materialQuestion = questions.find((q) => q.key === 'material');
  if (materialQuestion && materialQuestion.options) {
    const selectedMat = materialQuestion.options.find(
      (opt) => String(opt.value) === String(answers.material)
    );
    if (selectedMat && selectedMat.rate_per_sqft !== undefined) {
      materialRate = Number(selectedMat.rate_per_sqft) || 0;
    }
  }
  const baseMaterialCost = effectiveArea * materialRate;

  // 3. Tear Off Cost (Look up layers question or option with tear_off_per_sqft)
  let tearOffRate = 0;
  const layersQuestion = questions.find((q) => q.key === 'layers');
  if (layersQuestion && layersQuestion.options) {
    const selectedLayers = layersQuestion.options.find(
      (opt) => String(opt.value) === String(answers.layers)
    );
    if (selectedLayers && selectedLayers.tear_off_per_sqft !== undefined) {
      tearOffRate = Number(selectedLayers.tear_off_per_sqft) || 0;
    }
  }
  const tearOffCost = roofArea * tearOffRate;

  // 4. Pitch Multiplier
  let pitchMultiplier = 1.0;
  const pitchQuestion = questions.find((q) => q.key === 'pitch');
  if (pitchQuestion && pitchQuestion.options) {
    const selectedPitch = pitchQuestion.options.find(
      (opt) => String(opt.value) === String(answers.pitch)
    );
    if (selectedPitch && selectedPitch.multiplier !== undefined) {
      const parsed = parseFloat(String(selectedPitch.multiplier));
      if (!isNaN(parsed) && parsed > 0) {
        pitchMultiplier = parsed;
      }
    }
  }

  // 5. Stories Multiplier
  let storiesMultiplier = 1.0;
  const storiesQuestion = questions.find((q) => q.key === 'stories');
  if (storiesQuestion && storiesQuestion.options) {
    const selectedStories = storiesQuestion.options.find(
      (opt) => String(opt.value) === String(answers.stories)
    );
    if (selectedStories && selectedStories.multiplier !== undefined) {
      const parsed = parseFloat(String(selectedStories.multiplier));
      if (!isNaN(parsed) && parsed > 0) {
        storiesMultiplier = parsed;
      }
    }
  }

  // Multiply any additional dynamic question multipliers if custom questions exist
  let additionalMultiplier = 1.0;
  for (const q of activeQuestions) {
    if (['pitch', 'stories', 'material', 'layers', 'roof_area'].includes(q.key)) continue;
    if (q.type === 'select' && q.options) {
      const selected = q.options.find((opt) => String(opt.value) === String(answers[q.key]));
      if (selected && selected.multiplier !== undefined) {
        const parsed = parseFloat(String(selected.multiplier));
        if (!isNaN(parsed) && parsed > 0) {
          additionalMultiplier *= parsed;
        }
      }
    }
  }

  // 6. Subtotal
  const combinedMultiplier = pitchMultiplier * storiesMultiplier * additionalMultiplier;
  const subtotal = (baseMaterialCost + tearOffCost) * combinedMultiplier;

  // 7. Permit / Flat Fees
  const permitFlatFee = Number(config.modifiers?.permit_flat_fee) || 0;
  const baseTotal = subtotal + permitFlatFee;

  // 8. Range Spread %
  const rangeSpreadPct =
    config.modifiers?.range_spread_pct !== undefined
      ? Number(config.modifiers.range_spread_pct)
      : 12;
  const lowSpread = baseTotal * (1 - rangeSpreadPct / 100);
  const highSpread = baseTotal * (1 + rangeSpreadPct / 100);

  // Round to nearest 10 for clean quotes
  const estimateLow = Math.round(lowSpread / 10) * 10;
  const estimateHigh = Math.round(highSpread / 10) * 10;

  const breakdown = {
    roof_area: roofArea,
    waste_factor: wasteFactor,
    effective_area: Math.round(effectiveArea * 100) / 100,
    material_rate: materialRate,
    base_material_cost: Math.round(baseMaterialCost * 100) / 100,
    tear_off_rate: tearOffRate,
    tear_off_cost: Math.round(tearOffCost * 100) / 100,
    pitch_multiplier: pitchMultiplier,
    stories_multiplier: storiesMultiplier,
    subtotal: Math.round(subtotal * 100) / 100,
    permit_flat_fee: permitFlatFee,
    base_total: Math.round(baseTotal * 100) / 100,
    range_spread_pct: rangeSpreadPct,
    estimate_low: estimateLow,
    estimate_high: estimateHigh,
    currency: config.business?.currency || 'USD',
  };

  return {
    success: true,
    estimate_low: estimateLow,
    estimate_high: estimateHigh,
    breakdown,
  };
}
