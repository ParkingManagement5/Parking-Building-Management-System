package com.swp391.parking.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LicensePlateUtilTest {

    @Test
    void canonicalize_shouldTreatCommonPlateSeparatorsAsEquivalent() {
        assertThat(LicensePlateUtil.canonicalize("51A-99999")).isEqualTo("51A99999");
        assertThat(LicensePlateUtil.canonicalize("51A-999.99")).isEqualTo("51A99999");
        assertThat(LicensePlateUtil.canonicalize("51A 99999")).isEqualTo("51A99999");
        assertThat(LicensePlateUtil.canonicalize("51A.99999")).isEqualTo("51A99999");
        assertThat(LicensePlateUtil.canonicalize("51a-99999")).isEqualTo("51A99999");
        assertThat(LicensePlateUtil.canonicalize("51A/99999")).isEqualTo("51A99999");
    }

    @Test
    void canonicalize_shouldHandleNullAndBlankSafely() {
        assertThat(LicensePlateUtil.canonicalize(null)).isEmpty();
        assertThat(LicensePlateUtil.canonicalize("   ")).isEmpty();
        assertThat(LicensePlateUtil.equivalent(null, "51A-99999")).isFalse();
        assertThat(LicensePlateUtil.equivalent("   ", "51A-99999")).isFalse();
    }

    @Test
    void equivalent_shouldKeepDifferentPlatesDifferent() {
        assertThat(LicensePlateUtil.equivalent("51A-99999", "51A-999.99")).isTrue();
        assertThat(LicensePlateUtil.equivalent("51A-99999", "51A-99998")).isFalse();
    }

    @Test
    void normalizeDisplay_shouldPreserveHumanReadableFiveDigitFormat() {
        assertThat(LicensePlateUtil.normalizeDisplay("51A-99999")).isEqualTo("51A-999.99");
        assertThat(LicensePlateUtil.normalizeDisplay("51A/99999")).isEqualTo("51A-999.99");
    }
}
