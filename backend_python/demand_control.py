from dataclasses import dataclass


@dataclass
class DemandResult:
    installation_limit_kw: float
    building_consumption_kw: float
    available_for_evs_kw: float
    ev_requested_kw: float
    ev_allowed_kw: float
    total_requested_kw: float
    projected_total_kw: float
    utilization_pct: float
    limited: bool
    reduction_kw: float
    reduction_pct: float


def calculate_demand(
    installation_limit_kw: float,
    building_consumption_kw: float,
    ev_requested_kw: float,
) -> DemandResult:

    installation_limit_kw = max(
        float(installation_limit_kw),
        0
    )

    building_consumption_kw = max(
        float(building_consumption_kw),
        0
    )

    ev_requested_kw = max(
        float(ev_requested_kw),
        0
    )

    available_for_evs_kw = max(
        installation_limit_kw - building_consumption_kw,
        0
    )

    ev_allowed_kw = min(
        ev_requested_kw,
        available_for_evs_kw
    )

    total_requested_kw = (
        building_consumption_kw
        + ev_requested_kw
    )

    projected_total_kw = (
        building_consumption_kw
        + ev_allowed_kw
    )

    limited = ev_allowed_kw < ev_requested_kw

    reduction_kw = max(
        ev_requested_kw - ev_allowed_kw,
        0
    )

    if ev_requested_kw > 0:
        reduction_pct = (
            reduction_kw / ev_requested_kw
        ) * 100
    else:
        reduction_pct = 0

    if installation_limit_kw > 0:
        utilization_pct = (
            projected_total_kw
            / installation_limit_kw
        ) * 100
    else:
        utilization_pct = 0

    return DemandResult(
        installation_limit_kw=round(
            installation_limit_kw, 2
        ),
        building_consumption_kw=round(
            building_consumption_kw, 2
        ),
        available_for_evs_kw=round(
            available_for_evs_kw, 2
        ),
        ev_requested_kw=round(
            ev_requested_kw, 2
        ),
        ev_allowed_kw=round(
            ev_allowed_kw, 2
        ),
        total_requested_kw=round(
            total_requested_kw, 2
        ),
        projected_total_kw=round(
            projected_total_kw, 2
        ),
        utilization_pct=round(
            utilization_pct, 2
        ),
        limited=limited,
        reduction_kw=round(
            reduction_kw, 2
        ),
        reduction_pct=round(
            reduction_pct, 2
        ),
    )