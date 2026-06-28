package com.swp391.parking.util;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class LicensePlateUtil {

    private static final Pattern FIVE_DIGIT_SERIAL = Pattern.compile("^(.+?)(\\d{5})$");

    private LicensePlateUtil() {
    }

    public static String canonicalize(String licensePlate) {
        if (licensePlate == null || licensePlate.isBlank()) {
            return "";
        }
        return licensePlate.toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]", "");
    }

    public static boolean equivalent(String firstPlate, String secondPlate) {
        String first = canonicalize(firstPlate);
        String second = canonicalize(secondPlate);
        return !first.isBlank() && first.equals(second);
    }

    public static Set<String> lookupCandidates(String licensePlate) {
        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        if (licensePlate == null || licensePlate.isBlank()) {
            return candidates;
        }

        String upper = licensePlate.trim().toUpperCase(Locale.ROOT);
        addIfPresent(candidates, upper);
        addIfPresent(candidates, upper.replace(" ", ""));

        String canonical = canonicalize(licensePlate);
        addIfPresent(candidates, canonical);

        Matcher matcher = FIVE_DIGIT_SERIAL.matcher(canonical);
        if (matcher.matches()) {
            String prefix = matcher.group(1);
            String serial = matcher.group(2);
            addIfPresent(candidates, prefix + "-" + serial);
            addIfPresent(candidates, prefix + "-" + serial.substring(0, 3) + "." + serial.substring(3));
            addIfPresent(candidates, prefix + "." + serial);
            addIfPresent(candidates, prefix + " " + serial);
        }

        return candidates;
    }

    public static String normalizeDisplay(String licensePlate) {
        if (licensePlate == null) {
            return null;
        }

        String canonical = canonicalize(licensePlate);
        Matcher matcher = FIVE_DIGIT_SERIAL.matcher(canonical);
        if (matcher.matches()) {
            String prefix = matcher.group(1);
            String serial = matcher.group(2);
            return prefix + "-" + serial.substring(0, 3) + "." + serial.substring(3);
        }

        return licensePlate.toUpperCase(Locale.ROOT).replace(" ", "");
    }

    private static void addIfPresent(Set<String> candidates, String value) {
        if (value != null && !value.isBlank()) {
            candidates.add(value);
        }
    }
}
