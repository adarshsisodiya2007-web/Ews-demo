package com.ews.ner.infra.alert;

import com.ews.ner.domain.alert.Alert;
import com.ews.ner.domain.region.Region;

public interface AlertDispatcher {
    void dispatch(Alert alert, Region region);
    String channelName();
}
